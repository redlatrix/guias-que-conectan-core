import { RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import { Grado, CompetenciaCS, DBACatalogo } from '../models/interfaces';


export interface DBAConContexto extends DBACatalogo {
  grado_nombre:      string;
  grado_numero:      number;
  competencia_nombre: string;
  competencia_tipo:  string;
}

export const catalogoRepository = {

  async findAllGrados(): Promise<Grado[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM grado ORDER BY numero ASC'
    );
    return rows as Grado[];
  },

  async findCompetencias(area?: string): Promise<CompetenciaCS[]> {
    if (area) {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM competencia_cs WHERE area = ? ORDER BY nombre ASC',
        [area]
      );
      return rows as CompetenciaCS[];
    }
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM competencia_cs ORDER BY nombre ASC'
    );
    return rows as CompetenciaCS[];
  },

  async findDBAs(gradoId?: number, competenciaId?: number): Promise<DBACatalogo[]> {
    let sql = 'SELECT * FROM dba_catalogo WHERE 1=1';
    const params: number[] = [];

    if (gradoId) {
      sql += ' AND grado_id = ?';
      params.push(gradoId);
    }
    if (competenciaId) {
      sql += ' AND competencia_id = ?';
      params.push(competenciaId);
    }
    sql += ' ORDER BY codigo_men ASC';

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    return rows as DBACatalogo[];
  },

  async findDBAById(id: number): Promise<DBACatalogo | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM dba_catalogo WHERE id = ?',
      [id]
    );
    return rows[0] ? (rows[0] as DBACatalogo) : null;
  },

  /**
   * Devuelve el DBA con los nombres completos del grado y la competencia.
   * Se usa para construir el system prompt enriquecido de ChatGPT.
   */
  async findDBAWithContext(id: number): Promise<DBAConContexto | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         d.id, d.grado_id, d.competencia_id, d.codigo_men,
         d.enunciado_oficial, d.evidencias_aprendizaje, d.creado_en,
         g.nombre   AS grado_nombre,
         g.numero   AS grado_numero,
         c.nombre   AS competencia_nombre,
         c.tipo_cs  AS competencia_tipo
       FROM dba_catalogo d
       INNER JOIN grado          g ON g.id = d.grado_id
       INNER JOIN competencia_cs c ON c.id = d.competencia_id
       WHERE d.id = ?`,
      [id]
    );
    return rows[0] ? (rows[0] as DBAConContexto) : null;
  },
};
