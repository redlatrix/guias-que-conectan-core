// ─────────────────────────────────────────────────────────
// Interfaces TypeScript — Guías que Conectan Core
// ─────────────────────────────────────────────────────────

export interface Grado {
  id: number;
  nombre: string;
  numero: number;
  area: string;
}

export interface CompetenciaCS {
  id: number;
  nombre: string;
  tipo_cs: string;
  descripcion: string;
  area: string;
}

export interface DBACatalogo {
  id: number;
  grado_id: number;
  codigo_men: string;
  enunciado_oficial: string;
  evidencias_aprendizaje: string;
  creado_en?: Date;
}

export type EstadoSesion = 'activa' | 'completada' | 'cancelada';

export interface SesionGeneracion {
  id: number;
  docente_id: number;
  dba_catalogo_id: number;
  competencia_id?: number | null;
  modelo_ia: string;
  estado: EstadoSesion;
  prompt_sistema: string | null;
  creado_en?: Date;
}

export type EstadoGuia = 'borrador' | 'publicado';
export type TipoBloque = 'texto' | 'imagen' | 'actividad' | 'cuestionario';

export interface BloqueContenido {
  tipo: TipoBloque;
  contenido: string;
  metadata: Record<string, unknown>;
}

export interface Guia {
  id: number;
  sesion_id: number;
  dba_catalogo_id: number;
  titulo: string;
  version_numero: number;
  estado: EstadoGuia;
  es_version_activa: boolean;
  contenido_json: BloqueContenido[];
  creado_en?: Date;
  actualizado_en?: Date;
  docente_nombre?: string;
  grado_nombre?: string;
  grado_numero?: number;
  area?: string;
}

export type TipoAccion = 'generar' | 'iterar' | 'editar';

export interface IteracionIA {
  id: number;
  guia_id: number;
  numero_iteracion: number;
  tipo_accion: TipoAccion;
  prompt_docente: string;
  respuesta_ia_raw: string;
  creado_en?: Date;
}

export type TipoRecurso = 'IMAGEN' | 'PDF' | 'LINK';

export interface RecursoComplementario {
  id: number;
  guia_id: number;
  tipo: TipoRecurso;
  url_almacenamiento: string;
  prompt_generacion: string | null;
  seccion_referencia: string | null;
  creado_en?: Date;
}

export interface JwtPayload {
  id: number;        // usuario_id — viene del auth-api como "id"
  email: string;
  rol: string;       // 'admin' | 'docente'
  iat?: number;
  exp?: number;
}

import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
