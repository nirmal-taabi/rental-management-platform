import { pool } from '../config/database.js';

const parseDraftData = (value) => (typeof value === 'string' ? JSON.parse(value) : value);

const mapDraft = (row) => ({
  id: row.id,
  customer: parseDraftData(row.draft_data) || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findCustomerDraftsByShop = async (shopId, connection = pool) => {
  const [rows] = await connection.query(
    'SELECT id, draft_data, created_at, updated_at FROM customer_drafts WHERE shop_id = ? ORDER BY updated_at DESC, id DESC',
    [shopId],
  );
  return rows.map(mapDraft);
};

export const findCustomerDraftById = async (shopId, draftId, connection = pool) => {
  const [rows] = await connection.query(
    'SELECT id, draft_data, created_at, updated_at FROM customer_drafts WHERE shop_id = ? AND id = ? LIMIT 1',
    [shopId, draftId],
  );
  return rows[0] ? mapDraft(rows[0]) : null;
};

export const createCustomerDraft = async (shopId, userId, customer, connection = pool) => {
  const [result] = await connection.query(
    'INSERT INTO customer_drafts (shop_id, created_by_user_id, draft_data) VALUES (?, ?, ?)',
    [shopId, userId || null, JSON.stringify(customer)],
  );
  return findCustomerDraftById(shopId, result.insertId, connection);
};

export const updateCustomerDraft = async (shopId, draftId, customer, connection = pool) => {
  await connection.query(
    'UPDATE customer_drafts SET draft_data = ? WHERE shop_id = ? AND id = ?',
    [JSON.stringify(customer), shopId, draftId],
  );
  return findCustomerDraftById(shopId, draftId, connection);
};

export const deleteCustomerDraft = async (shopId, draftId, connection = pool) => {
  const [result] = await connection.query(
    'DELETE FROM customer_drafts WHERE shop_id = ? AND id = ?',
    [shopId, draftId],
  );
  return result.affectedRows > 0;
};