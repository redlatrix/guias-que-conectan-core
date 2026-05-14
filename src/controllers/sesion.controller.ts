import { Response, NextFunction } from 'express';
import { AuthRequest } from '../models/interfaces';
import { sesionService } from '../services/sesion.service';
import { CrearSesionDTO } from '../validators/sesion.schema';

export const sesionController = {

  async crear(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as CrearSesionDTO;
      const docente_id = req.user!.id;

      const sesion = await sesionService.crear({
        docente_id,
        dba_catalogo_id: body.dba_catalogo_id,
        competencia_id:  body.competencia_id ?? null,
        modelo_ia:       body.modelo_ia,
      });

      res.status(201).json(sesion);
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ error: err.message });
      } else {
        next(err);
      }
    }
  },

  async obtener(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const sesion = await sesionService.obtener(id);
      res.json(sesion);
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({ error: err.message });
      } else {
        next(err);
      }
    }
  },
};
