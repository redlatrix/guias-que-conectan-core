import { sesionRepository } from '../repositories/sesion.repository';
import { catalogoRepository } from '../repositories/catalogo.repository';
import { SesionGeneracion } from '../models/interfaces';

export const sesionService = {

  async crear(data: {
    docente_id: number;
    dba_catalogo_id: number;
    modelo_ia?: string;
  }): Promise<SesionGeneracion> {
    // Verificar que el DBA existe
    const dba = await catalogoRepository.findDBAById(data.dba_catalogo_id);
    if (!dba) {
      throw Object.assign(new Error('DBA no encontrado'), { status: 404 });
    }

    const modelo = data.modelo_ia || process.env.OPENAI_MODEL || 'gpt-4o-mini';

    // Construir el system prompt base con el DBA
    const promptSistema = buildSystemPrompt(dba.enunciado_oficial, dba.evidencias_aprendizaje ?? '');

    return sesionRepository.create({
      docente_id:      data.docente_id,
      dba_catalogo_id: data.dba_catalogo_id,
      modelo_ia:       modelo,
      prompt_sistema:  promptSistema,
    });
  },

  async obtener(id: number): Promise<SesionGeneracion> {
    const sesion = await sesionRepository.findById(id);
    if (!sesion) {
      throw Object.assign(new Error('Sesión no encontrada'), { status: 404 });
    }
    return sesion;
  },

  async listarPorDocente(docente_id: number): Promise<SesionGeneracion[]> {
    return sesionRepository.findByDocente(docente_id);
  },
};

function buildSystemPrompt(enunciado: string, evidencias: string): string {
  return `Eres un asistente pedagógico especializado en Ciencias Sociales para el sistema educativo colombiano.
Tu tarea es crear guías didácticas alineadas con los Derechos Básicos de Aprendizaje (DBA) del Ministerio de Educación Nacional.

DBA a trabajar:
"${enunciado}"

Evidencias de aprendizaje:
${evidencias}

Al crear la guía, sigue estas instrucciones:
1. Estructura la guía con secciones claras usando Markdown (##).
2. Incluye introducción, desarrollo temático, actividades y preguntas evaluativas.
3. Alinea todo el contenido explícitamente con el DBA.
4. Las actividades deben estar contextualizadas al territorio colombiano.
5. Si necesitas incluir una imagen, usa exactamente este formato: [IMAGE: "descripción detallada de la imagen"]
6. Usa un lenguaje apropiado para el grado indicado.
7. La guía debe ser práctica y lista para usar en el aula.`;
}
