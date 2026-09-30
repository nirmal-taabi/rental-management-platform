import mysql from 'mysql2/promise';
import env from './env.js';

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const testConnection = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
};

export { pool, testConnection };
