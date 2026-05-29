import { BloqueContenido, TipoBloque } from '../models/interfaces';

/**
 * Convierte el texto Markdown generado por IA en un array de bloques estructurados.
 *
 * Reglas de detección:
 * - Líneas que empiezan con "## Actividad" o "**Actividad" → tipo: 'actividad'
 * - Líneas que contienen ![...](url) con ruta /storage/images/ → tipo: 'imagen'
 * - Líneas que empiezan con "**Pregunta" o "?" → tipo: 'cuestionario'
 * - Todo lo demás → tipo: 'texto'
 *
 * Los bloques contiguos del mismo tipo se agrupan.
 */
export function markdownToJson(text: string): BloqueContenido[] {
  const sections = text.split(/(?=^##\s)/m).filter(s => s.trim().length > 0);

  const bloques: BloqueContenido[] = [];

  for (const section of sections) {
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let imgMatch: RegExpExecArray | null;
    const lines = section.split('\n');
    let currentTipo: TipoBloque = 'texto';
    let currentLines: string[] = [];

    const flushBloque = () => {
      const contenido = currentLines.join('\n').trim();
      if (contenido.length > 0) {
        bloques.push({
          tipo: currentTipo,
          contenido,
          metadata: buildMetadata(currentTipo, contenido),
        });
      }
      currentLines = [];
    };

    for (const line of lines) {
      const tipo = detectTipo(line);

      if (tipo !== currentTipo) {
        flushBloque();
        currentTipo = tipo;
      }
      currentLines.push(line);
    }
    flushBloque();

    const bloquesConImagenes: BloqueContenido[] = [];
    for (const bloque of bloques) {
      if (bloque.tipo !== 'imagen') {
        const partes = splitImagesFromText(bloque);
        bloquesConImagenes.push(...partes);
      } else {
        bloquesConImagenes.push(bloque);
      }
    }
    bloques.length = 0;
    bloques.push(...bloquesConImagenes);
  }

  return bloques;
}

function detectTipo(line: string): TipoBloque {
  const trimmed = line.trim();

  if (/^!\[.*?\]\(\/storage\/images\/.+\)/.test(trimmed)) return 'imagen';

  if (/^#{1,3}\s*(actividad|taller|ejercicio)/i.test(trimmed)) return 'actividad';
  if (/^\*\*(actividad|taller|ejercicio)/i.test(trimmed)) return 'actividad';

  if (/^#{1,3}\s*(pregunta|preguntas|cuestionario|evaluaci[oó]n)/i.test(trimmed)) return 'cuestionario';
  if (/^\*\*(pregunta|preguntas|cuestionario)/i.test(trimmed)) return 'cuestionario';
  if (/^\d+\.\s+¿/.test(trimmed)) return 'cuestionario';

  return 'texto';
}

function buildMetadata(tipo: TipoBloque, contenido: string): Record<string, unknown> {
  switch (tipo) {
    case 'actividad':
      return {
        duracion_min: extraerDuracion(contenido) ?? 30,
        tipo: extraerTipoActividad(contenido) ?? 'individual',
      };
    case 'cuestionario':
      return {
        tipo_pregunta: contenido.includes('¿') ? 'abierta' : 'cerrada',
      };
    case 'imagen': {
      const m = contenido.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      return m ? { alt: m[1], url: m[2] } : {};
    }
    default:
      return {};
  }
}

function extraerDuracion(text: string): number | null {
  const minMatch = text.match(/(\d+)\s*min/i);
  if (minMatch) return parseInt(minMatch[1]);
  const horaMatch = text.match(/(\d+)\s*h(?:ora)?s?/i);
  if (horaMatch) return parseInt(horaMatch[1]) * 60;
  return null;
}

function extraerTipoActividad(text: string): string | null {
  if (/grupal/i.test(text)) return 'grupal';
  if (/pareja|parejas/i.test(text)) return 'parejas';
  if (/individual/i.test(text)) return 'individual';
  return null;
}

/**
 * Divide un bloque de texto que puede contener imágenes Markdown embebidas.
 */
function splitImagesFromText(bloque: BloqueContenido): BloqueContenido[] {
  const imgRegex = /!\[([^\]]*)\]\((\/storage\/images\/[^)]+)\)/g;
  const partes: BloqueContenido[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(bloque.contenido)) !== null) {
    const before = bloque.contenido.slice(lastIndex, match.index).trim();
    if (before) {
      partes.push({ tipo: 'texto', contenido: before, metadata: {} });
    }

    partes.push({
      tipo: 'imagen',
      contenido: match[0],
      metadata: { alt: match[1], url: match[2], prompt: match[1] },
    });

    lastIndex = match.index + match[0].length;
  }
  
  const after = bloque.contenido.slice(lastIndex).trim();
  if (after) {
    partes.push({ tipo: bloque.tipo, contenido: after, metadata: bloque.metadata });
  }

  return partes.length > 0 ? partes : [bloque];
}
