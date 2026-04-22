import { Response, NextFunction } from 'express';
import { AuthRequest, EstadoGuia } from '../models/interfaces';
import { guiaService } from '../services/guia.service';
import { GenerarGuiaDTO, IterarGuiaDTO, EditarGuiaDTO } from '../validators/guia.schema';

export const guiaController = {

  async generar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as GenerarGuiaDTO;
      const guia = await guiaService.generar({
        sesion_id:          body.sesion_id,
        prompt_docente:     body.prompt_docente,
        numero_estudiantes: body.numero_estudiantes ?? 30,
        duracion_sesion:    body.duracion_sesion    ?? '1 hora',
      });
      res.status(201).json(guia);
    } catch (err: any) {
      if (err.status) res.status(err.status).json({ error: err.message });
      else next(err);
    }
  },

  async iterar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const guia_id = Number(req.params.id);
      const body    = req.body as IterarGuiaDTO;

      const nuevaVersion = await guiaService.iterar({
        guia_id,
        prompt_docente: body.prompt_docente,
      });
      res.status(201).json(nuevaVersion);
    } catch (err: any) {
      if (err.status) res.status(err.status).json({ error: err.message });
      else next(err);
    }
  },

  /**
   * GET /api/guias
   * Lista todas las guías activas con filtros opcionales.
   * Si se pasa ?mis_guias=true, filtra por el docente autenticado.
   */
  async listar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { grado_id, dba_id, estado, mis_guias } = req.query as {
        grado_id?:  string;
        dba_id?:    string;
        estado?:    string;
        mis_guias?: string;
      };

      let docente_id: number | undefined;
      if (mis_guias === 'true') {
        docente_id = req.user!.id;
      }

      const guias = await guiaService.listar({
        grado_id:   grado_id ? Number(grado_id) : undefined,
        dba_id:     dba_id   ? Number(dba_id)   : undefined,
        estado:     estado   as EstadoGuia | undefined,
        docente_id,
      });
      res.json(guias);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/guias/mis-guias
   * Atajo: devuelve solo las guías del docente autenticado.
   * Acepta los mismos filtros opcionales que /api/guias.
   */
  async misGuias(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { grado_id, dba_id, estado } = req.query as {
        grado_id?: string;
        dba_id?:   string;
        estado?:   string;
      };

      const docente_id = req.user!.id;

      const guias = await guiaService.listar({
        docente_id,
        grado_id: grado_id ? Number(grado_id) : undefined,
        dba_id:   dba_id   ? Number(dba_id)   : undefined,
        estado:   estado   as EstadoGuia | undefined,
      });
      res.json(guias);
    } catch (err) {
      next(err);
    }
  },

  async obtener(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id   = Number(req.params.id);
      const guia = await guiaService.obtener(id);
      res.json(guia);
    } catch (err: any) {
      if (err.status) res.status(err.status).json({ error: err.message });
      else next(err);
    }
  },

  async editar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id   = Number(req.params.id);
      const body = req.body as EditarGuiaDTO;
      const guia = await guiaService.editar(id, body);
      res.json(guia);
    } catch (err: any) {
      if (err.status) res.status(err.status).json({ error: err.message });
      else next(err);
    }
  },

  async publicar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id   = Number(req.params.id);
      const guia = await guiaService.publicar(id);
      res.json({ mensaje: 'Guía publicada exitosamente', guia });
    } catch (err: any) {
      if (err.status) res.status(err.status).json({ error: err.message });
      else next(err);
    }
  },
};
