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
  return `Eres un experto en creacin diseño de guias de aprendizaje pedagógico siguiendo estrictamente los lineamientos del Ministerio de Educación Nacional (MEN) de Colombia.
Tu tarea es construir una guía de aprendizaje que cumpla con los estándares de calidad para Ciencias Sociales.

REFERENCIAS CURRICULARES:
- DBA: "${enunciado}"
- EVIDENCIAS: ${evidencias}

INSTRUCCIONES DE DISEÑO (Según el MEN):
1. ESTRUCTURA DE SECUENCIA DIDÁCTICA: La guía debe seguir estos momentos:
   - Exploración (Saber previo): Preguntas para conectar con la realidad del estudiante.
   - Estructuración (Conceptualización): El contenido teórico alineado al DBA.
   - Transferencia (Aplicación): Actividad donde se aplica lo aprendido en el contexto local/colombiano.
   - Valoración (Evaluación): No genérica.

2. EVALUACIÓN FORMATIVA RIGUROSA:
   - Crea una Rúbrica de Desempeño basada en los niveles de competencia del MEN (Bajo, Básico, Alto, Superior).
   - Los criterios de la rúbrica deben derivarse directamente de las "Evidencias de Aprendizaje" proporcionadas.
   - Incluye una sección de "Autoevaluación" donde el estudiante reflexione sobre su proceso de aprendizaje.

3. CONTEXTUALIZACIÓN COLOMBIANA:
   - Utiliza situaciones reales del territorio nacional, la Constitución Política de 1991 o la historia de Colombia para los ejemplos y ejercicios.

4. FORMATO:
   - Usa Markdown (##).
   - Para sugerencias visuales usa: [IMAGE: "descripción detallada para material educativo"].`;
}