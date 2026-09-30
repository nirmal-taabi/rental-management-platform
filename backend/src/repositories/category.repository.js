import { pool } from '../config/database.js';
import { createAuditLog } from './audit.repository.js';

export const mapCategoryRow = (row = {}) => ({
  id: row.id,
  shopId: row.shop_id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  status: String(row.status || 'active').toUpperCase(),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findCategoriesByShop = async (shopId, options = {}, connection = pool) => {
  const page = Math.max(1, Number(options.page || 1));
  const limit = Math.min(100, Math.max(1, Number(options.limit || 100)));
  const offset = (page - 1) * limit;
  const values = [shopId];
  let where = 'shop_id = ? AND is_deleted = 0';
  if (options.status) {
    where += ' AND status = ?';
    values.push(String(options.status).toLowerCase());
  }
  if (options.search) {
    where += ' AND (name LIKE ? OR description LIKE ?)';
    const term = `%${String(options.search).trim()}%`;
    values.push(term, term);
  }
  const sortBy = ['name', 'created_at', 'updated_at', 'status'].includes(options.sortBy) ? options.sortBy : 'name';
  const sortOrder = String(options.sortOrder).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const [rows] = await connection.query(
    `SELECT * FROM categories WHERE ${where} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );
  return rows.map(mapCategoryRow);
};

export const countCategoriesByShop = async (shopId, options = {}, connection = pool) => {
  const values = [shopId];
  let where = 'shop_id = ? AND is_deleted = 0';
  if (options.status) {
    where += ' AND status = ?';
    values.push(String(options.status).toLowerCase());
  }
  if (options.search) {
    where += ' AND (name LIKE ? OR description LIKE ?)';
    const term = `%${String(options.search).trim()}%`;
    values.push(term, term);
  }
  const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM categories WHERE ${where}`, values);
  return Number(rows[0]?.total || 0);
};

export const findCategoryById = async (shopId, categoryId, connection = pool) => {
  const [rows] = await connection.query(
    'SELECT * FROM categories WHERE id = ? AND shop_id = ? AND is_deleted = 0 LIMIT 1',
    [categoryId, shopId],
  );
  return rows[0] ? mapCategoryRow(rows[0]) : null;
};

export const findCategoryBySlug = async (shopId, slug, excludeId, connection = pool) => {
  const values = [shopId, slug];
  let query = 'SELECT id FROM categories WHERE shop_id = ? AND slug = ?';
  if (excludeId) {
    query += ' AND id <> ?';
    values.push(excludeId);
  }
  query += ' LIMIT 1';
  const [rows] = await connection.query(query, values);
  return rows[0] || null;
};

export const createCategoryRecord = async (shopId, payload, audit, connection = pool) => {
  const ownsConnection = connection === pool;
  const db = ownsConnection ? await pool.getConnection() : connection;
  try {
    if (ownsConnection) await db.beginTransaction();
    const [result] = await db.query(
      `INSERT INTO categories (shop_id, name, slug, description, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [shopId, payload.name, payload.slug, payload.description || null],
    );
    const category = await findCategoryById(shopId, result.insertId, db);
    await createAuditLog({ ...audit, shopId, entityType: 'category', entityId: result.insertId, action: 'created', newValues: category }, db);
    if (ownsConnection) await db.commit();
    return category;
  } catch (error) {
    if (ownsConnection) await db.rollback();
    throw error;
  } finally {
    if (ownsConnection) db.release();
  }
};

export const updateCategoryRecord = async (shopId, categoryId, payload, audit, connection = pool) => {
  const ownsConnection = connection === pool;
  const db = ownsConnection ? await pool.getConnection() : connection;
  try {
    if (ownsConnection) await db.beginTransaction();
    const previous = await findCategoryById(shopId, categoryId, db);
    if (!previous) {
      if (ownsConnection) await db.rollback();
      return null;
    }
    await db.query(
      'UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ? AND shop_id = ? AND is_deleted = 0',
      [payload.name, payload.slug, payload.description || null, categoryId, shopId],
    );
    const category = await findCategoryById(shopId, categoryId, db);
    await createAuditLog({ ...audit, shopId, entityType: 'category', entityId: categoryId, action: 'updated', oldValues: previous, newValues: category }, db);
    if (ownsConnection) await db.commit();
    return category;
  } catch (error) {
    if (ownsConnection) await db.rollback();
    throw error;
  } finally {
    if (ownsConnection) db.release();
  }
};

export const updateCategoryStatusRecord = async (shopId, categoryId, status, audit) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const previous = await findCategoryById(shopId, categoryId, connection);
    if (!previous) {
      await connection.rollback();
      return null;
    }
    await connection.query('UPDATE categories SET status = ? WHERE id = ? AND shop_id = ? AND is_deleted = 0', [status.toLowerCase(), categoryId, shopId]);
    const category = await findCategoryById(shopId, categoryId, connection);
    await createAuditLog({ ...audit, shopId, entityType: 'category', entityId: categoryId, action: status === 'ACTIVE' ? 'activated' : 'deactivated', oldValues: previous, newValues: category }, connection);
    await connection.commit();
    return category;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const findCategoryByName = async (shopId, name, excludeId, connection = pool) => {
  const values = [shopId, String(name).trim()];
  let query = 'SELECT id FROM categories WHERE shop_id = ? AND LOWER(name) = LOWER(?) AND is_deleted = 0';
  if (excludeId) {
    query += ' AND id <> ?';
    values.push(excludeId);
  }
  query += ' LIMIT 1';
  const [rows] = await connection.query(query, values);
  return rows[0] || null;
};