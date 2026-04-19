import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../config/db';
import { IteracionIA, TipoAccion } from '../models/interfaces';

export const iteracionRepository = {

  async create(data: {
    guia_id: number;
    tipo_accion: TipoAccion;
    prompt_docente: string;
    respuesta_ia_raw: string;
  }): Promise<IteracionIA> {
    // Obtener el número de iteración actual para esta guía
    const [countRows] = await pool.query<RowDataPacket[]>(
      'SELECT COALESCE(MAX(numero_iteracion), 0) AS max_iter FROM iteracion_ia WHERE guia_id = ?',
      [data.guia_id]
    );
    const numeroIteracion = (countRows[0]?.max_iter as number ?? 0) + 1;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO iteracion_ia (guia_id, numero_iteracion, tipo_accion, prompt_docente, respuesta_ia_raw)
       VALUES (?, ?, ?, ?, ?)`,
      [data.guia_id, numeroIteracion, data.tipo_accion, data.prompt_docente, data.respuesta_ia_raw]
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM iteracion_ia WHERE id = ?',
      [result.insertId]
    );
    return rows[0] as IteracionIA;
  },

  async findByGuia(guia_id: number): Promise<IteracionIA[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM iteracion_ia WHERE guia_id = ? ORDER BY numero_iteracion ASC',
      [guia_id]
    );
    return rows as IteracionIA[];
  },
};
