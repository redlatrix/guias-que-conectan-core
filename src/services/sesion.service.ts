import { sesionRepository } from '../repositories/sesion.repository';
import { catalogoRepository } from '../repositories/catalogo.repository';
import { SesionGeneracion } from '../models/interfaces';

export const sesionService = {

  async crear(data: {
    docente_id: number;
    dba_catalogo_id: number;
    modelo_ia?: string;
  }): Promise<SesionGeneracion> {
    // Verificar que el DBA existe
    const dba = await catalogoRepository.findDBAById(data.dba_catalogo_id);
    if (!dba) {
      throw Object.assign(new Error('DBA no encontrado'), { status: 404 });
    }

    const modelo = data.modelo_ia || process.env.OPENAI_MODEL || 'gpt-4o-mini';

    return sesionRepository.create({
      docente_id:      data.docente_id,
      dba_catalogo_id: data.dba_catalogo_id,
      modelo_ia:       modelo,
    });
  },

  async obtener(id: number): Promise<SesionGeneracion> {
    const sesion = await sesionRepository.findById(id);
    if (!sesion) {
      throw Object.assign(new Error('Sesión no encontrada'), { status: 404 });
    }
    return sesion;
  },

  async listarPorDocente(docente_id: number): Promise<SesionGeneracion[]> {
    return sesionRepository.findByDocente(docente_id);
  },
};
