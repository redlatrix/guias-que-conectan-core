import mysql from 'mysql2/promise';

/**
 * Pool de conexiones a MySQL.
 * Reutiliza conexiones en lugar de abrir una nueva por cada query.
 */
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || 'guias_conectan_core',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Verificar conexión al iniciar (no detiene el servidor si falla)
pool.getConnection()
  .then(conn => {
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
    console.error('⚠️  Verifica las credenciales en el .env');
  });

export default pool;
