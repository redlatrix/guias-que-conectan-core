import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../config/db';
import { SesionGeneracion, EstadoSesion } from '../models/interfaces';

export const sesionRepository = {

  async create(data: {
    docente_id: number;
    dba_catalogo_id: number;
    competencia_id?: number | null;
    modelo_ia: string;
    prompt_sistema?: string;
  }): Promise<SesionGeneracion> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO sesion_generacion
         (docente_id, dba_catalogo_id, competencia_id, modelo_ia, prompt_sistema)
       VALUES (?, ?, ?, ?, ?)`,
      [data.docente_id, data.dba_catalogo_id, data.competencia_id ?? null,
       data.modelo_ia, data.prompt_sistema ?? null]
    );
    const sesion = await this.findById(result.insertId);
    return sesion!;
  },

  async findById(id: number): Promise<SesionGeneracion | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM sesion_generacion WHERE id = ?',
      [id]
    );
    return rows[0] ? (rows[0] as SesionGeneracion) : null;
  },

  async findByDocente(docente_id: number): Promise<SesionGeneracion[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM sesion_generacion WHERE docente_id = ? ORDER BY creado_en DESC',
      [docente_id]
    );
    return rows as SesionGeneracion[];
  },

  async updateEstado(id: number, estado: EstadoSesion): Promise<void> {
    await pool.query(
      'UPDATE sesion_generacion SET estado = ? WHERE id = ?',
      [estado, id]
    );
  },
};
