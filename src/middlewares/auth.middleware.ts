import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload } from '../models/interfaces';

/**
 * Middleware de autenticación JWT.
 * Valida el Bearer token usando el JWT_SECRET compartido con auth-api.
 * Si el token es válido, adjunta el payload a req.user.
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token no proporcionado. Usa Authorization: Bearer <token>' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: 'JWT_SECRET no configurado en el servidor' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as unknown as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expirado. Vuelve a iniciar sesión.' });
    } else {
      res.status(401).json({ error: 'Token inválido.' });
    }
  }
}
