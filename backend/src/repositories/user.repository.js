import { pool } from '../config/database.js';

export const findUserByEmail = async (email, connection = pool) => {
  const [rows] = await connection.query('SELECT * FROM users WHERE email = ? AND is_deleted = 0 LIMIT 1', [email]);
  return rows[0] || null;
};

export const findUserById = async (userId, connection = pool) => {
  const [rows] = await connection.query('SELECT * FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1', [userId]);
  return rows[0] || null;
};

export const createUser = async (payload, connection = pool) => {
  const [result] = await connection.query(
    `INSERT INTO users (shop_id, first_name, last_name, email, phone, password_hash, status, is_owner)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.shopId,
      payload.firstName,
      payload.lastName,
      payload.email,
      payload.phone,
      payload.passwordHash,
      payload.status || 'active',
      payload.isOwner ? 1 : 0,
    ],
  );

  const [rows] = await connection.query('SELECT * FROM users WHERE id = ? LIMIT 1', [result.insertId]);
  return rows[0];
};

export const getSafeUserSummary = (user) => ({
  id: user.id,
  shopId: user.shop_id,
  firstName: user.first_name,
  lastName: user.last_name,
  name: `${user.first_name} ${user.last_name || ''}`.trim(),
  email: user.email,
  phone: user.phone,
  status: user.status,
  isOwner: Boolean(user.is_owner),
  passwordResetRequired: Boolean(user.password_reset_required),
});
