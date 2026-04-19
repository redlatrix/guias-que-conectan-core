import { Request, Response, NextFunction } from 'express';

/**
 * Handler global de errores. Debe registrarse ÚLTIMO en app.ts.
 * Captura cualquier error no manejado y responde con formato estándar.
 */
export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = process.env.NODE_ENV === 'development';

  console.error('❌ Error no manejado:', err.message);
  if (isDev) console.error(err.stack);

  res.status(500).json({
    error: 'Error interno del servidor',
    ...(isDev && { detalle: err.message }),
  });
}
