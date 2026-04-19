import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../config/db';
import { RecursoComplementario, TipoRecurso } from '../models/interfaces';

export const recursoRepository = {

  async create(data: {
    guia_id: number;
    tipo: TipoRecurso;
    url_almacenamiento: string;
    prompt_generacion?: string;
    seccion_referencia?: string;
  }): Promise<RecursoComplementario> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO recurso_complementario (guia_id, tipo, url_almacenamiento, prompt_generacion, seccion_referencia)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.guia_id,
        data.tipo,
        data.url_almacenamiento,
        data.prompt_generacion ?? null,
        data.seccion_referencia ?? null,
      ]
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM recurso_complementario WHERE id = ?',
      [result.insertId]
    );
    return rows[0] as RecursoComplementario;
  },

  async findByGuia(guia_id: number): Promise<RecursoComplementario[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM recurso_complementario WHERE guia_id = ? ORDER BY creado_en ASC',
      [guia_id]
    );
    return rows as RecursoComplementario[];
  },
};
