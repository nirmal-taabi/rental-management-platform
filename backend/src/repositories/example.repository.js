import { pool } from '../config/database.js';

export const findExampleById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM example_table WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};
