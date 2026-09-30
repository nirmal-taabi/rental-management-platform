import { pool } from '../config/database.js';

export const findRoleByShopAndSlug = async (shopId, slug, connection = pool) => {
  const [rows] = await connection.query(
    'SELECT * FROM roles WHERE shop_id = ? AND slug = ? AND is_deleted = 0 LIMIT 1',
    [shopId, slug],
  );
  return rows[0] || null;
};

export const createRole = async (payload, connection = pool) => {
  const [result] = await connection.query(
    'INSERT INTO roles (shop_id, name, slug, description, is_system) VALUES (?, ?, ?, ?, ?)',
    [payload.shopId, payload.name, payload.slug, payload.description || '', payload.isSystem ? 1 : 0],
  );

  const [rows] = await connection.query('SELECT * FROM roles WHERE id = ? LIMIT 1', [result.insertId]);
  return rows[0];
};

export const findRolesForUser = async (userId, shopId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT r.name FROM user_roles ur
     INNER JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND ur.shop_id = ? AND r.is_deleted = 0`,
    [userId, shopId],
  );

  return rows.map((row) => row.name);
};

export const assignRoleToUser = async (shopId, userId, roleId, connection = pool) => {
  await connection.query(
    'INSERT INTO user_roles (shop_id, user_id, role_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)',
    [shopId, userId, roleId],
  );
};
