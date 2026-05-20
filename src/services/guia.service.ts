import { sesionRepository } from '../repositories/sesion.repository';
import { guiaRepository } from '../repositories/guia.repository';
import { iteracionRepository } from '../repositories/iteracion.repository';
import { catalogoRepository, DBAConContexto } from '../repositories/catalogo.repository';
import { openaiService, ChatMessage } from './openai.service';
import { imageParserService } from './image-parser.service';
import { markdownToJson } from '../utils/markdown-to-json';
import { Guia, BloqueContenido, EstadoGuia, CompetenciaCS } from '../models/interfaces';

/**
 * Orquestador principal del microservicio.
 * Coordina: Sesión → Prompt estructurado → IA → Parser imágenes → Markdown→JSON → BD
 */
export const guiaService = {

  /**
   * ★ Flujo principal: genera una guía completa con IA
   */
  async generar(data: {
    sesion_id:          number;
    prompt_docente:     string;
    numero_estudiantes: number;
    duracion_sesion:    string;
  }): Promise<Guia> {
    // 1. Cargar la sesión
    const sesion = await sesionRepository.findById(data.sesion_id);
    if (!sesion) {
      throw Object.assign(new Error('Sesión no encontrada'), { status: 404 });
    }

    // 2. Obtener el DBA con contexto de grado
    const dba = await catalogoRepository.findDBAWithContext(sesion.dba_catalogo_id);
    if (!dba) {
      throw Object.assign(new Error('DBA del catálogo no encontrado'), { status: 404 });
    }

    // 2b. Obtener la competencia como metadato independiente desde la sesión
    const competencia = sesion.competencia_id
      ? await catalogoRepository.findCompetenciaById(sesion.competencia_id)
      : null;

    // 3. Construir el prompt estructurado final
    const promptCompleto = buildPromptEstructurado(dba, competencia, {
      solicitud_docente:  data.prompt_docente,
      numero_estudiantes: data.numero_estudiantes,
      duracion_sesion:    data.duracion_sesion,
    });

    // 4. Mensajes para ChatGPT:
    //    El prompt estructurado va directamente en el 'user' para mayor control.
    //    El 'system' lo usamos solo para definir el rol del asistente.
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'Eres un experto en pedagogía del Ministerio de Educación Nacional de Colombia. ' +
          'Diseñas guías de aprendizaje para Ciencias Sociales estrictamente alineadas con los ' +
          'Derechos Básicos de Aprendizaje (DBA). Siempre respondes en Markdown limpio y estructurado.',
      },
      {
        role: 'user',
        content: promptCompleto,
      },
    ];

    // 5. Llamar a ChatGPT
    console.log('🤖 Consultando ChatGPT...');
    console.log(`   DBA: ${dba.codigo_men} — Grado ${dba.grado_numero}: ${dba.grado_nombre}`);
    let respuestaRaw = await openaiService.chat(messages);

    // 5b. Fallback: si GPT no incluyó el tag [IMAGE:], lo inyectamos
    if (!respuestaRaw.includes('[IMAGE:')) {
      console.log('⚠️  GPT no incluyó [IMAGE:], inyectando fallback...');
      const descripcionFallback = buildImageFallback(dba, data.prompt_docente);
      const tagFallback = `\n\n[IMAGE: "${descripcionFallback}"]\n\n`;
      // Insertar justo antes de la sección ## ACTIVIDADES DE DESARROLLO (o al final si no existe)
      const marcador = respuestaRaw.match(/^##\s+ACTIVIDADES DE DESARROLLO/im);
      if (marcador?.index !== undefined) {
        respuestaRaw =
          respuestaRaw.slice(0, marcador.index) +
          tagFallback +
          respuestaRaw.slice(marcador.index);
      } else {
        respuestaRaw += tagFallback;
      }
    }

    // 6. Crear registro temporal de la guía para vincular recursos
    const titulo = extraerTitulo(respuestaRaw) || `Guía ${dba.codigo_men} — ${dba.grado_nombre}`;
    const guiaTemporal = await guiaRepository.create({
      sesion_id:       data.sesion_id,
      dba_catalogo_id: sesion.dba_catalogo_id,
      titulo,
      contenido_json:  [],
      version_numero:  1,
    });

    // 7. Registrar la iteración en BD (guardamos el prompt completo que se envió)
    await iteracionRepository.create({
      guia_id:          guiaTemporal.id,
      tipo_accion:      'generar',
      prompt_docente:   promptCompleto,
      respuesta_ia_raw: respuestaRaw,
    });

    // 8. Procesar etiquetas [IMAGE: "..."] → DALL-E → disco → BD
    console.log('🖼️  Procesando imágenes...');
    const textoProcesado = await imageParserService.process(respuestaRaw, guiaTemporal.id, data.prompt_docente);

    // 9. Convertir Markdown procesado → array de bloques JSON
    const contenidoJson = markdownToJson(textoProcesado);

    // 10. Actualizar la guía con el contenido final
    const guiaFinal = await guiaRepository.update(guiaTemporal.id, {
      titulo,
      contenido_json: contenidoJson,
    });

    // 11. Marcar sesión como completada
    await sesionRepository.updateEstado(data.sesion_id, 'completada');

    console.log(`✅ Guía generada: ID ${guiaFinal!.id} — "${titulo}"`);
    return guiaFinal!;
  },

  /**
   * Refina una guía existente con un nuevo prompt (crea nueva versión).
   * Mantiene el historial de conversación para que la IA tenga contexto.
   */
  async iterar(data: {
    guia_id:        number;
    prompt_docente: string;
  }): Promise<Guia> {
    const guiaActual = await guiaRepository.findById(data.guia_id);
    if (!guiaActual) {
      throw Object.assign(new Error('Guía no encontrada'), { status: 404 });
    }

    const sesion = await sesionRepository.findById(guiaActual.sesion_id);
    if (!sesion) {
      throw Object.assign(new Error('Sesión asociada no encontrada'), { status: 404 });
    }

    // Historial de la conversación (máx. últimas 3 iteraciones para no exceder tokens)
    const iteracionesAnteriores = await iteracionRepository.findByGuia(data.guia_id);
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'Eres un experto en pedagogía del Ministerio de Educación Nacional de Colombia. ' +
          'Diseñas guías de aprendizaje para Ciencias Sociales alineadas con los DBA. ' +
          'Siempre respondes en Markdown limpio y estructurado.',
      },
    ];

    const historial = iteracionesAnteriores.slice(-3);
    for (const iter of historial) {
      messages.push({ role: 'user',      content: iter.prompt_docente });
      messages.push({ role: 'assistant', content: iter.respuesta_ia_raw });
    }
    messages.push({ role: 'user', content: data.prompt_docente });

    console.log('🤖 Consultando ChatGPT para iteración...');
    const respuestaRaw = await openaiService.chat(messages);

    const nuevaVersion = guiaActual.version_numero + 1;
    const titulo = extraerTitulo(respuestaRaw) || guiaActual.titulo;

    const nuevaGuia = await guiaRepository.crearNuevaVersion({
      guia_anterior_id: guiaActual.id,
      sesion_id:        guiaActual.sesion_id,
      dba_catalogo_id:  guiaActual.dba_catalogo_id,
      titulo,
      contenido_json:   [],
      version_numero:   nuevaVersion,
    });

    await iteracionRepository.create({
      guia_id:          nuevaGuia.id,
      tipo_accion:      'iterar',
      prompt_docente:   data.prompt_docente,
      respuesta_ia_raw: respuestaRaw,
    });

    const textoProcesado = await imageParserService.process(respuestaRaw, nuevaGuia.id, data.prompt_docente);
    const contenidoJson  = markdownToJson(textoProcesado);

    const guiaFinal = await guiaRepository.update(nuevaGuia.id, { titulo, contenido_json: contenidoJson });
    console.log(`✅ Nueva versión generada: ID ${guiaFinal!.id} (v${nuevaVersion})`);
    return guiaFinal!;
  },

  async obtener(id: number): Promise<Guia> {
    const guia = await guiaRepository.findById(id);
    if (!guia) throw Object.assign(new Error('Guía no encontrada'), { status: 404 });
    return guia;
  },

  async listar(filtros: {
    grado_id?:   number;
    dba_id?:     number;
    estado?:     EstadoGuia;
    docente_id?: number;
  }): Promise<Guia[]> {
    return guiaRepository.findAll(filtros);
  },

  async listarPublicas(): Promise<Guia[]> {
    return guiaRepository.findAllPublicas();
  },

  async obtenerPublica(id: number): Promise<Guia> {
    const guia = await guiaRepository.findById(id);
    if (!guia || guia.estado !== 'publicado') {
      throw Object.assign(new Error('Guía no encontrada'), { status: 404 });
    }
    return guia;
  },

  async editar(id: number, data: {
    titulo?: string;
    contenido_json?: BloqueContenido[];
  }): Promise<Guia> {
    const guia = await guiaRepository.findById(id);
    if (!guia) throw Object.assign(new Error('Guía no encontrada'), { status: 404 });
    return (await guiaRepository.update(id, data))!;
  },

  async publicar(id: number): Promise<Guia> {
    const guia = await guiaRepository.findById(id);
    if (!guia) throw Object.assign(new Error('Guía no encontrada'), { status: 404 });
    return (await guiaRepository.publish(id))!;
  },

  async regenerarImagen(guiaId: number, prompt: string): Promise<{ url: string }> {
    const guia = await guiaRepository.findById(guiaId);
    if (!guia) throw Object.assign(new Error('Guía no encontrada'), { status: 404 });
    const url = await imageParserService.generarImagen(prompt, guiaId);
    return { url };
  },
};


interface ComplejidadGrado {
  nivel: string;
  descripcion: string;
  preguntasVisuales: number;
  taxonomiaVisual: string;
  conceptosClave: number;
  lineasReflexion: number;
}

function getComplejidadPorGrado(grado_numero: number): ComplejidadGrado {
  if (grado_numero <= 3) {
    return {
      nivel: 'Complejidad Inicial',
      descripcion:
        'Enfoca el contenido en el reconocimiento del entorno cercano (familia, escuela, barrio) y nociones básicas de tiempo y espacio. ' +
        'Usa lenguaje sumamente sencillo y cercano. ' +
        'Las actividades deben ser lúdicas, gráficas, de emparejar, dibujar o describir de forma oral y escrita muy corta. ' +
        'Las preguntas deben tener respuestas de una o dos palabras o frases muy breves.',
      preguntasVisuales: 2,
      taxonomiaVisual: 'Recordar/Comprender (respuestas cortas)',
      conceptosClave: 2,
      lineasReflexion: 3,
    };
  }
  if (grado_numero <= 5) {
    return {
      nivel: 'Complejidad Baja',
      descripcion:
        'Enfoca el contenido en la organización político-administrativa del territorio (municipio y departamento) y el respeto por la diversidad cultural. ' +
        'Usa lenguaje claro y descriptivo. ' +
        'Las actividades incluyen comprensión de lectura corta (un párrafo), mapas simples para colorear y cuestionarios guiados de falso/verdadero. ' +
        'Evita conceptos abstractos; apóyate en ejemplos concretos y visuales.',
      preguntasVisuales: 2,
      taxonomiaVisual: 'Comprender/Aplicar',
      conceptosClave: 3,
      lineasReflexion: 4,
    };
  }
  if (grado_numero <= 7) {
    return {
      nivel: 'Complejidad Baja-Media',
      descripcion:
        'Enfoca el contenido en la identificación, descripción y comparación de fenómenos sociales y geográficos. ' +
        'Diseña actividades guiadas con reconocimiento de conceptos clave y cartografía básica. ' +
        'Las preguntas pueden pedir que el estudiante compare, clasifique o describa con sus propias palabras.',
      preguntasVisuales: 3,
      taxonomiaVisual: 'Analizar (comparar, clasificar, relacionar causas)',
      conceptosClave: 4,
      lineasReflexion: 4,
    };
  }
  if (grado_numero <= 9) {
    return {
      nivel: 'Complejidad Media-Alta',
      descripcion:
        'Enfoca el contenido en la explicación de causas y consecuencias, la argumentación y el análisis de múltiples perspectivas o fuentes históricas. ' +
        'Las actividades deben exigir justificar opiniones, contrastar fuentes y elaborar textos cortos de análisis. ' +
        'Las preguntas deben ser abiertas y requerir razonamiento, no solo memorización.',
      preguntasVisuales: 4,
      taxonomiaVisual: 'Analizar/Evaluar (explicación multicausal)',
      conceptosClave: 4,
      lineasReflexion: 5,
    };
  }
  return {
    nivel: 'Complejidad Alta / Avanzada',
    descripcion:
      'Enfoca el contenido en el pensamiento sistémico, el análisis crítico de modelos macroeconómicos, la evaluación de impactos globales y locales ' +
      'y la formulación de propuestas de solución a problemáticas reales. ' +
      'Las preguntas deben ser abiertas, problematizadoras y de nivel universitario introductorio. ' +
      'Exige argumentación con evidencias, perspectivas múltiples y postura crítica fundamentada.',
    preguntasVisuales: 4,
    taxonomiaVisual: 'Evaluar/Crear (juicio crítico, deconstrucción de discursos)',
    conceptosClave: 5,
    lineasReflexion: 6,
  };
}

/**
 * Construye el prompt estructurado completo que se envía a ChatGPT.
 * Usa exactamente el formato pedagógico del MEN.
 */
function buildPromptEstructurado(
  dba: DBAConContexto,
  competencia: CompetenciaCS | null,
  opciones: {
    solicitud_docente:  string;
    numero_estudiantes: number;
    duracion_sesion:    string;
  }
): string {
  const { solicitud_docente, numero_estudiantes, duracion_sesion } = opciones;
  const complejidad = getComplejidadPorGrado(dba.grado_numero);

  const lineasRespuestaVisual = Array(3).fill('    _________________________').join('\n');
  const lineasReflexion = Array(complejidad.lineasReflexion).fill('    _________________________').join('\n');

  const partBCount  = Math.max(0, complejidad.preguntasVisuales - 2);
  const partBLetras = ['c', 'd'].slice(0, partBCount);
  const partBBloque = partBCount > 0
    ? `\n\n   **Parte B — Comprensión del Tema** (${partBLetras.join(', ')}): Formula exactamente ${partBCount} pregunta${partBCount > 1 ? 's' : ''} de nivel taxonómico ${complejidad.taxonomiaVisual} orientadas directamente al contenido del DBA, análisis de causas/consecuencias o situaciones problema del contexto colombiano. Estas preguntas NO deben depender de la imagen. Cada una incluye 3 líneas de respuesta:\n${lineasRespuestaVisual}`
    : '';

  return `Actúa como un experto en pedagogía del Ministerio de Educación Nacional de Colombia. Tu tarea es diseñar una guía de aprendizaje para Ciencias Sociales estrictamente alineada con los Derechos Básicos de Aprendizaje (DBA).

### CONTEXTO DEL DBA:
- Área: Ciencias Sociales
- Grado: ${dba.grado_numero}° — ${dba.grado_nombre}
- Competencia: ${competencia?.nombre ?? 'Ciencias Sociales'}
- DBA: ${dba.enunciado_oficial}
- Evidencias de aprendizaje: ${dba.evidencias_aprendizaje ?? 'No especificadas'}

### SOLICITUD DEL DOCENTE:
- Objetivo del profesor: "${solicitud_docente}"
- Número de estudiantes: ${numero_estudiantes}
- Duración de la sesión: ${duracion_sesion}

### LINEAMIENTOS PEDAGÓGICOS MEN 2026 (OBLIGATORIO):
Debes enfocar los contenidos bajo los lineamientos actuales del MEN: prioriza el desarrollo del pensamiento crítico, la formación ciudadana, la conciencia histórico-temporal y el pensamiento sistémico ejemplo: (comprender cómo las decisiones económicas afectan el entorno social y ambiental). Evita el enfoque tradicional de memorización de datos o geografía descriptiva.

### COMPLEJIDAD Y NIVEL DE LENGUAJE — GRADO ${dba.grado_numero}° (${complejidad.nivel}):
${complejidad.descripcion}
Adapta el vocabulario, la extensión de los textos, el tipo de preguntas y las actividades para que sean apropiadas a este nivel. Esta regla aplica a TODAS las secciones de la guía sin excepción.

### INSTRUCCIONES DE DISEÑO Y ESTRUCTURA:
Debes generar la guía siguiendo esta estructura de bloques. Para cada sección usa títulos de Markdown (##).

1. **IDENTIFICACIÓN**: Datos generales (área, grado, DBA).
2. **PREGUNTA PROBLEMATIZADORA**: Una pregunta retadora y contextualizada para el estudiante.
3. **PROPÓSITOS**: Saber (conceptual), Saber Hacer (procedimental) y Saber Ser (actitudinal).
4. **ACTIVIDADES DE INICIO**: Exploración de saberes previos. Estima el tiempo necesario.
5. **ACTIVIDADES DE DESARROLLO**: Conceptualización y práctica. Estima el tiempo necesario.
6. **ACTIVIDADES DE CIERRE**: Producto final y síntesis. Estima el tiempo necesario.
7. **EVALUACIÓN**: Criterios formativos e instrumento de evaluación sugerido.
8. **ATENCIÓN A LA DIVERSIDAD**: Adaptaciones específicas para diferentes ritmos de aprendizaje.
9. **ACTIVIDAD PRÁCTICA IMPRIMIBLE**: Diseña una hoja de trabajo imprimible para que el estudiante complete en papel. Esta sección DEBE comenzar con el encabezado exacto "## ACTIVIDAD PRÁCTICA IMPRIMIBLE" y contener los siguientes elementos en orden (NO incluyas campos de Nombre/Grado/Fecha — el sistema los agrega automáticamente):

   a) **Ejercicio 1 — Apertura Visual e Integración Temática** Inserta aquí la etiqueta [IMAGE: "descripción detallada"]. Divide las ${complejidad.preguntasVisuales} preguntas en dos partes:

   **Parte A — Conexión Visual** (a, b): Formula exactamente 2 preguntas de nivel taxonómico ${complejidad.taxonomiaVisual} enfocadas estrictamente en la observación, lectura crítica y análisis de la ilustración. El estudiante debe responder basándose en lo que ve en la imagen. Cada pregunta incluye 3 líneas de respuesta:
${lineasRespuestaVisual}${partBBloque}

   c) **Ejercicio 2 — Análisis de Conceptos**: Crea una tabla Markdown con dos columnas: "Concepto clave" y "Lo que significa (escribe aquí)". Incluye EXACTAMENTE ${complejidad.conceptosClave} conceptos clave extraídos del DBA. La columna de respuesta debe quedar vacía para que el estudiante la complete a mano.
      Ejemplo de estructura:
      | Concepto clave | Lo que significa (escribe aquí) |
      |---|---|
      | [Concepto 1] | |

   d) **Ejercicio 3 — Reflexión personal** (nivel ${complejidad.taxonomiaVisual} de la Taxonomía de Bloom): Una sola pregunta abierta que invite al estudiante a conectar el DBA con su propia realidad o contexto colombiano. Deja EXACTAMENTE ${complejidad.lineasReflexion} líneas de respuesta con guiones bajos:
${lineasReflexion}

     Al finalizar la sección incluye: "Criterio de evaluación: _________________________ Calificación: _____"

### REGLAS DE FORMATO (CRÍTICO):
1. **FORMATO DE SALIDA**: Entrega todo en Markdown limpio y bien estructurado.
2. **INSERCIÓN DE IMAGEN PEDAGÓGICA - OBLIGATORIO:
    DEBES incluir exactamente una etiqueta [IMAGE: "descripción"] que actúe como apoyo visual clave.
    La descripción debe ser una instrucción para un generador de imágenes (DALL-E) 
    basada exclusivamente en el tema de la guía y la solicitud del docente: "${solicitud_docente}".

    FORMATO: [IMAGE: "Descripción detallada de una ilustración educativa de alta calidad, estilo flat design, 
    que incluya elementos como: [objetos específicos del tema], con un enfoque pedagógico y profesional."]

    UBICACIÓN: Colócala donde aporte más valor educativo, preferiblemente al inicio de la 
    ACTIVIDAD PRÁCTICA IMPRIMIBLE para que sirva de base a los ejercicios.
3. **REALISMO**: Las actividades deben ser posibles para ${numero_estudiantes} estudiantes en ${duracion_sesion}.
4. **NO ALUCINACIÓN**: Si sugieres un recurso externo (video, libro), no inventes el nombre; descríbelo como "Recurso sugerido sobre [Tema]".
5. **CONTEXTUALIZACIÓN**: Usa ejemplos del contexto colombiano, territorios y realidades locales.
6. **ACTIVIDAD IMPRIMIBLE — OBLIGATORIO**: DEBES incluir la sección "## ACTIVIDAD PRÁCTICA IMPRIMIBLE" como la última sección de la guía. Las líneas de respuesta se representan con 25 guiones bajos seguidos: _________________________ — Las tablas usan formato Markdown estándar con | para columnas. NO omitas esta sección bajo ninguna circunstancia.`;
}

/**
 * Extrae el título de la guía buscando la primera línea con # en el Markdown.
 */
function extraerTitulo(text: string): string | null {
  const match = text.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Construye una descripción visual de fallback para DALL-E
 * cuando GPT no incluyó el tag [IMAGE:] en su respuesta.
 */
function buildImageFallback(dba: DBAConContexto, promptDocente: string): string {
  const tema = dba.grado_nombre || "Ciencias Sociales";
  return `Ilustración educativa profesional y minimalista sobre ${tema}, contexto escolar colombiano, elementos visuales relacionados con ${promptDocente.slice(0, 50)}`;
}
