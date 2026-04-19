import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware genérico de validación con Zod.
 * Valida req.body contra el schema proporcionado.
 * Si falla, responde 400 con los errores formateados.
 *
 * Uso: router.post('/ruta', validate(miSchema), miController)
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errores = err.errors.map(e => ({
          campo: e.path.join('.'),
          mensaje: e.message,
        }));
        res.status(400).json({ error: 'Datos inválidos', detalles: errores });
      } else {
        next(err);
      }
    }
  };
}
