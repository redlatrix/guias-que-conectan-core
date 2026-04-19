import { z } from 'zod';

export const generarGuiaSchema = z.object({
  sesion_id: z
    .number({ required_error: 'sesion_id es requerido' })
    .int()
    .positive('sesion_id debe ser un entero positivo'),

  prompt_docente: z
    .string({ required_error: 'prompt_docente es requerido' })
    .min(10, 'El prompt debe tener al menos 10 caracteres')
    .max(2000, 'El prompt no puede exceder 2000 caracteres'),

  numero_estudiantes: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(30),

  duracion_sesion: z
    .string()
    .optional()
    .default('1 hora'),
});

export const iterarGuiaSchema = z.object({
  prompt_docente: z
    .string({ required_error: 'prompt_docente es requerido' })
    .min(5, 'El prompt debe tener al menos 5 caracteres')
    .max(2000, 'El prompt no puede exceder 2000 caracteres'),
});

const bloqueSchema = z.object({
  tipo:     z.enum(['texto', 'imagen', 'actividad', 'cuestionario']),
  contenido: z.string().min(1),
  metadata:  z.record(z.unknown()).optional().default({}),
});

export const editarGuiaSchema = z.object({
  titulo:         z.string().min(3).max(300).optional(),
  contenido_json: z.array(bloqueSchema).optional(),
}).refine(data => data.titulo || data.contenido_json, {
  message: 'Debes enviar al menos titulo o contenido_json para editar',
});

export type GenerarGuiaDTO  = z.infer<typeof generarGuiaSchema>;
export type IterarGuiaDTO  = z.infer<typeof iterarGuiaSchema>;
export type EditarGuiaDTO  = z.infer<typeof editarGuiaSchema>;
