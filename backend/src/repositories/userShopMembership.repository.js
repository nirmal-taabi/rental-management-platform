import { pool } from '../config/database.js';

const membershipSelect = `
  SELECT
    membership.id AS membership_id,
    membership.user_id,
    membership.shop_id,
    membership.role,
    membership.status AS membership_status,
    membership.is_default,
    shop.name,
    shop.slug,
    shop.legal_name,
    shop.email,
    shop.phone,
    shop.address_line1,
    shop.city,
    shop.state,
    shop.postal_code,
    shop.gst_number,
    shop.status AS shop_status
  FROM user_shop_memberships membership
  INNER JOIN shops shop ON shop.id = membership.shop_id
`;

export const findActiveShopMembership = async (userId, shopId, connection = pool) => {
  const [rows] = await connection.query(
    `${membershipSelect}
     WHERE membership.user_id = ?
       AND membership.shop_id = ?
       AND membership.status = 'active'
       AND membership.deleted_at IS NULL
       AND shop.status = 'active'
       AND shop.is_deleted = 0
     LIMIT 1`,
    [userId, shopId],
  );
  return rows[0] || null;
};

export const findDefaultShopMembership = async (userId, connection = pool) => {
  const [rows] = await connection.query(
    `${membershipSelect}
     WHERE membership.user_id = ?
       AND membership.status = 'active'
       AND membership.deleted_at IS NULL
       AND shop.status = 'active'
       AND shop.is_deleted = 0
     ORDER BY membership.is_default DESC, membership.created_at ASC, membership.id ASC
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
};

export const findShopMembershipsForUser = async (userId, connection = pool) => {
  const [rows] = await connection.query(
    `${membershipSelect}
     WHERE membership.user_id = ?
       AND membership.status = 'active'
       AND membership.deleted_at IS NULL
       AND shop.is_deleted = 0
     ORDER BY membership.is_default DESC, shop.name ASC, membership.id ASC`,
    [userId],
  );
  return rows;
};

export const findShopMembershipsForUserForUpdate = async (userId, connection) => {
  const [rows] = await connection.query(
    `${membershipSelect}
     WHERE membership.user_id = ?
       AND membership.status = 'active'
       AND membership.deleted_at IS NULL
       AND shop.is_deleted = 0
     ORDER BY membership.id
     FOR UPDATE`,
    [userId],
  );
  return rows;
};

export const createShopMembership = async (payload, connection = pool) => {
  const [result] = await connection.query(
    `INSERT INTO user_shop_memberships (user_id, shop_id, role, status, is_default)
     VALUES (?, ?, ?, ?, ?)`,
    [
      payload.userId,
      payload.shopId,
      String(payload.role || 'STAFF').toUpperCase(),
      payload.status || 'active',
      payload.isDefault ? 1 : 0,
    ],
  );

  const [rows] = await connection.query(
    'SELECT * FROM user_shop_memberships WHERE id = ? LIMIT 1',
    [result.insertId],
  );
  return rows[0] || null;
};