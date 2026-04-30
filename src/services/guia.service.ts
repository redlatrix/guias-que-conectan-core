import { sesionRepository } from '../repositories/sesion.repository';
import { guiaRepository } from '../repositories/guia.repository';
import { iteracionRepository } from '../repositories/iteracion.repository';
import { catalogoRepository, DBAConContexto } from '../repositories/catalogo.repository';
import { openaiService, ChatMessage } from './openai.service';
import { imageParserService } from './image-parser.service';
import { markdownToJson } from '../utils/markdown-to-json';
import { Guia, BloqueContenido, EstadoGuia } from '../models/interfaces';

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

    // 2. Obtener el DBA con contexto completo (nombre grado, nombre competencia)
    const dba = await catalogoRepository.findDBAWithContext(sesion.dba_catalogo_id);
    if (!dba) {
      throw Object.assign(new Error('DBA del catálogo no encontrado'), { status: 404 });
    }

    // 3. Construir el prompt estructurado final
    const promptCompleto = buildPromptEstructurado(dba, {
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
    const textoProcesado = await imageParserService.process(respuestaRaw, guiaTemporal.id);

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

    const textoProcesado = await imageParserService.process(respuestaRaw, nuevaGuia.id);
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

// ── Helpers privados ─────────────────────────────────────────

/**
 * Construye el prompt estructurado completo que se envía a ChatGPT.
 * Usa exactamente el formato pedagógico del MEN.
 */
function buildPromptEstructurado(
  dba: DBAConContexto,
  opciones: {
    solicitud_docente:  string;
    numero_estudiantes: number;
    duracion_sesion:    string;
  }
): string {
  const { solicitud_docente, numero_estudiantes, duracion_sesion } = opciones;

  return `Actúa como un experto en pedagogía del Ministerio de Educación Nacional de Colombia. Tu tarea es diseñar una guía de aprendizaje para Ciencias Sociales estrictamente alineada con los Derechos Básicos de Aprendizaje (DBA).

### CONTEXTO DEL DBA:
- Área: Ciencias Sociales
- Grado: ${dba.grado_numero}° — ${dba.grado_nombre}
- Competencia: ${dba.competencia_nombre}
- DBA: ${dba.enunciado_oficial}
- Evidencias de aprendizaje: ${dba.evidencias_aprendizaje ?? 'No especificadas'}

### SOLICITUD DEL DOCENTE:
- Objetivo del profesor: "${solicitud_docente}"
- Número de estudiantes: ${numero_estudiantes}
- Duración de la sesión: ${duracion_sesion}

### INSTRUCCIONES DE DISEÑO Y ESTRUCTURA:
Debes generar la guía siguiendo esta estructura de bloques. Para cada sección usa títulos de Markdown (##).

1. **IDENTIFICACIÓN**: Datos generales (institución, área, grado, DBA, fecha sugerida).
2. **PREGUNTA PROBLEMATIZADORA**: Una pregunta retadora y contextualizada para el estudiante.
3. **PROPÓSITOS**: Saber (conceptual), Saber Hacer (procedimental) y Saber Ser (actitudinal).
4. **ACTIVIDADES DE INICIO**: Exploración de saberes previos. Estima el tiempo necesario.
5. **ACTIVIDADES DE DESARROLLO**: Conceptualización y práctica. Estima el tiempo necesario.
6. **ACTIVIDADES DE CIERRE**: Producto final y síntesis. Estima el tiempo necesario.
7. **EVALUACIÓN**: Criterios formativos e instrumento de evaluación sugerido.
8. **ATENCIÓN A LA DIVERSIDAD**: Adaptaciones específicas para diferentes ritmos de aprendizaje.

### REGLAS DE FORMATO (CRÍTICO):
1. **FORMATO DE SALIDA**: Entrega todo en Markdown limpio y bien estructurado.
2. **INSERCIÓN DE IMÁGENES — OBLIGATORIO**: DEBES incluir exactamente 1 etiqueta [IMAGE:] en alguna sección de la guía. Si no la incluyes, la guía estará incompleta. La descripción debe indicar QUÉ OBJETOS Y SÍMBOLOS VISUALES concretos deben aparecer en la ilustración. Formato exacto:
   [IMAGE: "objetos y símbolos visuales específicos del tema, separados por comas"]
   Ejemplos:
   - Constitución 1991: [IMAGE: "libro de la constitución colombiana, balanza de justicia, bandera de Colombia, manos sosteniendo derechos, paloma de la paz"]
   - Globalización: [IMAGE: "globo terráqueo con flechas de intercambio, contenedor de barco, teléfono inteligente, gráfica económica, banderas de diferentes países"]
   - Regiones naturales: [IMAGE: "mapa de Colombia dividido en colores por región, cóndor andino, palma de cera, selva amazónica, mar caribe azul"]
   - Independencia: [IMAGE: "Simón Bolívar, mapa de Nueva Granada, bandera tricolor colombiana, año 1810, espada y pergamino"]
   RECUERDA: la etiqueta [IMAGE:] es OBLIGATORIA. Ponla en la sección de ACTIVIDADES DE DESARROLLO o PROPÓSITOS.
3. **REALISMO**: Las actividades deben ser posibles para ${numero_estudiantes} estudiantes en ${duracion_sesion}.
4. **NO ALUCINACIÓN**: Si sugieres un recurso externo (video, libro), no inventes el nombre; descríbelo como "Recurso sugerido sobre [Tema]".
5. **CONTEXTUALIZACIÓN**: Usa ejemplos del contexto colombiano, territorios y realidades locales.`;
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
  const tema = dba.competencia_nombre ?? dba.enunciado_oficial.slice(0, 80);
  const grado = `grado ${dba.grado_numero}`;
  // Tomamos las primeras palabras clave del prompt del docente para contexto
  const palabrasClave = promptDocente
    .replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 5)
    .join(', ');

  return `ilustración educativa sobre ${tema} para ${grado} en Colombia, con elementos visuales como: ${palabrasClave || tema}, mapa de Colombia, estudiantes, libros`;
}
