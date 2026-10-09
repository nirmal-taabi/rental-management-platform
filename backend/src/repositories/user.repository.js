import { pool } from '../config/database.js';

export const findUserByEmail = async (email, connection = pool) => {
  const [rows] = await connection.query('SELECT * FROM users WHERE email = ? AND is_deleted = 0 LIMIT 1', [email]);
  return rows[0] || null;
};

export const findActiveUserByEmail = async (email, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT * FROM users
     WHERE LOWER(email) = ? AND status = 'active' AND is_deleted = 0
     LIMIT 1`,
    [email],
  );
  return rows[0] || null;
};

export const findUserById = async (userId, connection = pool) => {
  const [rows] = await connection.query('SELECT * FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1', [userId]);
  return rows[0] || null;
};

export const revokeActivePasswordResetTokens = async (userId, connection = pool) => {
  await connection.query(
    `UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND used_at IS NULL`,
    [userId],
  );
};

export const createPasswordResetToken = async (userId, tokenHash, expiresAt, connection = pool) => {
  const [result] = await connection.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [userId, tokenHash, expiresAt],
  );
  return result.insertId;
};

export const revokePasswordResetToken = async (tokenHash, connection = pool) => {
  await connection.query(
    `UPDATE password_reset_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE token_hash = ? AND used_at IS NULL`,
    [tokenHash],
  );
};

export const findActivePasswordResetToken = async (tokenHash, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT t.id, t.user_id, u.status
     FROM password_reset_tokens t
     INNER JOIN users u ON u.id = t.user_id AND u.is_deleted = 0
     WHERE t.token_hash = ? AND t.used_at IS NULL
       AND t.expires_at > CURRENT_TIMESTAMP
     LIMIT 1 FOR UPDATE OF t, u`,
    [tokenHash],
  );
  return rows[0] || null;
};

export const updatePasswordFromReset = async (userId, passwordHash, connection = pool) => {
  await connection.query(
    `UPDATE users SET password_hash = ?, password_reset_required = 0,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND is_deleted = 0`,
    [passwordHash, userId],
  );
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
