import { Response, NextFunction } from 'express';
import { AuthRequest } from '../models/interfaces';
import { catalogoRepository } from '../repositories/catalogo.repository';

export const catalogoController = {

  async getGrados(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const grados = await catalogoRepository.findAllGrados();
      res.json(grados);
    } catch (err) {
      next(err);
    }
  },

  async getCompetencias(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { area } = req.query as { area?: string };
      const competencias = await catalogoRepository.findCompetencias(area);
      res.json(competencias);
    } catch (err) {
      next(err);
    }
  },

  async getDBAs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { grado_id } = req.query as { grado_id?: string };
      const dbas = await catalogoRepository.findDBAs(
        grado_id ? Number(grado_id) : undefined
      );
      res.json(dbas);
    } catch (err) {
      next(err);
    }
  },
};
