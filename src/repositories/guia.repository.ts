import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../config/db';
import { Guia, BloqueContenido, EstadoGuia } from '../models/interfaces';


function parseGuia(row: RowDataPacket): Guia {
  return {
    ...row,
    es_version_activa: Boolean(row.es_version_activa),
    contenido_json: typeof row.contenido_json === 'string'
      ? JSON.parse(row.contenido_json)
      : row.contenido_json,
  } as Guia;
}

export const guiaRepository = {

  async create(data: {
    sesion_id: number;
    dba_catalogo_id: number;
    titulo: string;
    contenido_json: BloqueContenido[];
    version_numero?: number;
  }): Promise<Guia> {
    const version = data.version_numero ?? 1;
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO guia (sesion_id, dba_catalogo_id, titulo, contenido_json, version_numero, estado, es_version_activa)
       VALUES (?, ?, ?, ?, ?, 'borrador', 1)`,
      [
        data.sesion_id,
        data.dba_catalogo_id,
        data.titulo,
        JSON.stringify(data.contenido_json),
        version,
      ]
    );
    const guia = await this.findById(result.insertId);
    return guia!;
  },

  async findById(id: number): Promise<Guia | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM guia WHERE id = ?',
      [id]
    );
    return rows[0] ? parseGuia(rows[0]) : null;
  },

  async findAll(filtros: {
    grado_id?:   number;
    dba_id?:     number;
    estado?:     EstadoGuia;
    docente_id?: number;
  }): Promise<Guia[]> {
    let sql = `
      SELECT g.*,
             gr.nombre AS grado_nombre,
             gr.numero AS grado_numero,
             gr.area   AS area,
             doc.nombre AS docente_nombre,
             CONCAT(d.codigo_men, ' ', d.enunciado_oficial) as titulo
      FROM guia g
      INNER JOIN dba_catalogo      d   ON g.dba_catalogo_id = d.id
      INNER JOIN grado             gr  ON d.grado_id        = gr.id
      INNER JOIN sesion_generacion s   ON g.sesion_id        = s.id
      LEFT  JOIN docente           doc ON doc.usuario_id     = s.docente_id
      WHERE g.es_version_activa = 1
    `;
    const params: (number | string)[] = [];

    if (filtros.docente_id) {
      sql += ' AND s.docente_id = ?';
      params.push(filtros.docente_id);
    }
    if (filtros.grado_id) {
      sql += ' AND d.grado_id = ?';
      params.push(filtros.grado_id);
    }
    if (filtros.dba_id) {
      sql += ' AND g.dba_catalogo_id = ?';
      params.push(filtros.dba_id);
    }
    if (filtros.estado) {
      sql += ' AND g.estado = ?';
      params.push(filtros.estado);
    }
    sql += ' ORDER BY g.creado_en DESC';

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    return rows.map(parseGuia);
  },

  /**
   * Crea una nueva versión de la guía y desactiva las anteriores.
   * Se usa en iterate y en edición manual.
   */
  async crearNuevaVersion(data: {
    guia_anterior_id: number;
    sesion_id: number;
    dba_catalogo_id: number;
    titulo: string;
    contenido_json: BloqueContenido[];
    version_numero: number;
  }): Promise<Guia> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        'UPDATE guia SET es_version_activa = 0 WHERE id = ?',
        [data.guia_anterior_id]
      );


      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO guia (sesion_id, dba_catalogo_id, titulo, contenido_json, version_numero, estado, es_version_activa)
         VALUES (?, ?, ?, ?, ?, 'borrador', 1)`,
        [
          data.sesion_id,
          data.dba_catalogo_id,
          data.titulo,
          JSON.stringify(data.contenido_json),
          data.version_numero,
        ]
      );

      await conn.commit();

      const guia = await this.findById(result.insertId);
      return guia!;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async update(id: number, data: {
    titulo?: string;
    contenido_json?: BloqueContenido[];
    estado?: EstadoGuia;
  }): Promise<Guia | null> {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (data.titulo !== undefined) {
      sets.push('titulo = ?');
      params.push(data.titulo);
    }
    if (data.contenido_json !== undefined) {
      sets.push('contenido_json = ?');
      params.push(JSON.stringify(data.contenido_json));
    }
    if (data.estado !== undefined) {
      sets.push('estado = ?');
      params.push(data.estado);
    }

    if (sets.length === 0) return this.findById(id);

    params.push(id);
    await pool.query(`UPDATE guia SET ${sets.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  },

  async publish(id: number): Promise<Guia | null> {
    await pool.query(
      "UPDATE guia SET estado = 'publicado' WHERE id = ?",
      [id]
    );
    return this.findById(id);
  },

  async findAllPublicas(): Promise<Guia[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT g.*,
             gr.nombre AS grado_nombre,
             gr.numero AS grado_numero,
             gr.area   AS area,
             doc.nombre AS docente_nombre,
            CONCAT(d.codigo_men , ' ' , d.enunciado_oficial) AS titulo
      FROM guia g
      INNER JOIN dba_catalogo      d   ON g.dba_catalogo_id = d.id
      INNER JOIN grado             gr  ON d.grado_id        = gr.id
      INNER JOIN sesion_generacion s   ON g.sesion_id        = s.id
      LEFT  JOIN docente           doc ON doc.usuario_id     = s.docente_id
      WHERE g.estado = 'publicado' AND g.es_version_activa = 1
      ORDER BY g.creado_en DESC
    `);
    return rows.map(parseGuia);
  },
};
