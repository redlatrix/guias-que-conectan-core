import { z } from 'zod';

export const crearSesionSchema = z.object({
  dba_catalogo_id: z
    .number({ required_error: 'Debes seleccionar un DBA específico' })
    .int()
    .min(1, 'Debes seleccionar un DBA específico antes de continuar'),

  modelo_ia: z
    .string()
    .optional(),
});

export type CrearSesionDTO = z.infer<typeof crearSesionSchema>;
