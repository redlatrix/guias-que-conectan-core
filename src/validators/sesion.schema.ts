import { z } from 'zod';

export const crearSesionSchema = z.object({
  dba_catalogo_id: z
    .number({ required_error: 'dba_catalogo_id es requerido' })
    .int()
    .positive('dba_catalogo_id debe ser un entero positivo'),

  modelo_ia: z
    .string()
    .optional(),
});

export type CrearSesionDTO = z.infer<typeof crearSesionSchema>;
