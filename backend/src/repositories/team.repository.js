import { pool } from '../config/database.js';

export const listShopTeamMembers = async (shopId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT u.id, u.first_name AS "firstName", u.last_name AS "lastName",
      CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS name,
      u.email, u.phone, u.status AS "accountStatus",
      m.role, m.status AS "membershipStatus", m.created_at AS "joinedAt"
     FROM user_shop_memberships m
     INNER JOIN users u ON u.id = m.user_id AND u.is_deleted = 0
     WHERE m.shop_id = ? AND m.deleted_at IS NULL
       AND m.status <> 'removed' AND UPPER(m.role) = 'STAFF'
     ORDER BY CASE m.status WHEN 'active' THEN 0 ELSE 1 END, u.first_name, u.id`,
    [shopId],
  );
  return rows;
};

export const findAccountByEmail = async (email, connection = pool) => {
  const [rows] = await connection.query(
    'SELECT id FROM users WHERE LOWER(email) = ? AND is_deleted = 0 LIMIT 1',
    [email],
  );
  return rows[0] || null;
};

export const createStaffAccount = async (payload, connection = pool) => {
  const [result] = await connection.query(
    `INSERT INTO users (
       shop_id, first_name, last_name, email, phone, password_hash,
       password_reset_required, status, is_owner
     ) VALUES (?, ?, ?, ?, ?, ?, 1, 'active', 0) RETURNING id`,
    [
      payload.shopId,
      payload.firstName,
      payload.lastName || null,
      payload.email,
      payload.phone || null,
      payload.passwordHash,
    ],
  );
  const userId = result.insertId;
  await connection.query(
    `INSERT INTO user_shop_memberships (user_id, shop_id, role, status, is_default)
     VALUES (?, ?, 'STAFF', 'active', 1)`,
    [userId, payload.shopId],
  );
  return userId;
};

export const findShopTeamMember = async (shopId, userId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT u.id, u.first_name AS "firstName", u.last_name AS "lastName",
      u.email, u.status AS "accountStatus", m.role, m.status AS "membershipStatus"
     FROM user_shop_memberships m
     INNER JOIN users u ON u.id = m.user_id AND u.is_deleted = 0
     WHERE m.shop_id = ? AND m.user_id = ? AND m.deleted_at IS NULL
       AND m.status <> 'removed' AND UPPER(m.role) = 'STAFF'
     LIMIT 1 FOR UPDATE OF m`,
    [shopId, userId],
  );
  return rows[0] || null;
};

export const updateShopTeamMemberStatus = async (shopId, userId, status, connection = pool) => {
  await connection.query(
    `UPDATE user_shop_memberships
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE shop_id = ? AND user_id = ? AND deleted_at IS NULL`,
    [status, shopId, userId],
  );
};

export const updatePasswordAndClearReset = async (userId, passwordHash, connection = pool) => {
  await connection.query(
    `UPDATE users
     SET password_hash = ?, password_reset_required = 0, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND is_deleted = 0`,
    [passwordHash, userId],
  );
};
