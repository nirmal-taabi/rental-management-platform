import { pool } from '../config/database.js';

export const findShopById = async (shopId, connection = pool) => {
  const [rows] = await connection.query('SELECT * FROM shops WHERE id = ? AND is_deleted = 0 LIMIT 1', [shopId]);
  return rows[0] || null;
};

export const createShop = async (payload, connection = pool) => {
  const [result] = await connection.query(
    `INSERT INTO shops (name, slug, legal_name, email, phone, address_line1, city, state, postal_code, gst_number, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      payload.name,
      payload.slug,
      payload.businessName || payload.legalName || payload.name,
      payload.email,
      payload.phone,
      payload.address,
      payload.city,
      payload.state,
      payload.pincode,
      payload.gstNumber || null,
    ],
  );

  return findShopById(result.insertId, connection);
};

export const updateShop = async (shopId, payload, connection = pool) => {
  const fields = [];
  const values = [];

  const allowedFields = {
    name: 'name',
    legal_name: 'legal_name',
    email: 'email',
    phone: 'phone',
    address_line1: 'address_line1',
    city: 'city',
    state: 'state',
    postal_code: 'postal_code',
    gst_number: 'gst_number',
  };

  Object.entries(allowedFields).forEach(([key, column]) => {
    if (payload[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(payload[key]);
    }
  });

  if (fields.length === 0) {
    return findShopById(shopId, connection);
  }

  values.push(shopId);
  await connection.query(`UPDATE shops SET ${fields.join(', ')} WHERE id = ?`, values);
  return findShopById(shopId, connection);
};

export const updateShopStatus = async (shopId, status, connection = pool) => {
  await connection.query('UPDATE shops SET status = ? WHERE id = ? AND is_deleted = 0', [status, shopId]);
  return findShopById(shopId, connection);
};

export const generateShopSlug = (name) => {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'shop';
};
