import { pool } from '../config/database.js';
import { INVENTORY_SORT_COLUMNS } from '../constants/inventory.constants.js';
import { createAuditLog } from './audit.repository.js';

const mapInventoryRow = (row = {}) => ({
  id: row.id,
  shopId: row.shop_id,
  productId: row.product_id,
  sku: row.sku,
  barcode: row.barcode,
  qrCode: row.qr_code,
  size: row.size,
  color: row.color,
  condition: String(row.inventory_condition || 'GOOD').toUpperCase(),
  status: String(row.status || 'AVAILABLE').toUpperCase(),
  purchaseDate: row.purchase_date ? (row.purchase_date instanceof Date ? row.purchase_date.toISOString().slice(0, 10) : String(row.purchase_date).slice(0, 10)) : null,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  product: {
    id: row.product_id,
    name: row.product_name,
    sku: row.product_sku,
    categoryId: row.category_id,
    category: row.category_name,
    imageUrl: row.product_image_url,
  },
});

const inventorySelect = `SELECT i.id, i.shop_id, i.product_id, i.item_code AS sku, i.barcode, i.qr_code,
  i.size, i.color, i.physical_condition AS inventory_condition, i.status, i.purchase_date, i.notes, i.created_at, i.updated_at,
  p.name AS product_name, p.sku AS product_sku, p.category_id, c.name AS category_name,
  (SELECT pi.image_url FROM product_images pi
   WHERE pi.shop_id = i.shop_id AND pi.product_id = p.id AND pi.is_deleted = 0
   ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC LIMIT 1) AS product_image_url
  FROM inventory_items i
  INNER JOIN products p ON p.id = i.product_id AND p.shop_id = i.shop_id
  LEFT JOIN categories c ON c.id = p.category_id AND c.shop_id = p.shop_id`;

const buildFilters = (shopId, options = {}) => {
  const values = [shopId];
  let where = 'i.shop_id = ? AND i.is_deleted = 0';
  if (options.status) {
    where += ' AND i.status = ?';
    values.push(options.status);
  }
  if (options.condition) {
    where += ' AND i.physical_condition = ?';
    values.push(options.condition);
  }
  if (options.productId) {
    where += ' AND i.product_id = ?';
    values.push(options.productId);
  }
  if (options.categoryId) {
    where += ' AND p.category_id = ?';
    values.push(options.categoryId);
  }
  if (options.size) {
    where += ' AND i.size = ?';
    values.push(options.size);
  }
  if (options.color) {
    where += ' AND LOWER(i.color) = LOWER(?)';
    values.push(options.color);
  }
  if (options.search) {
    const term = `%${options.search}%`;
    where += ` AND (i.item_code LIKE ? OR i.barcode LIKE ? OR p.name LIKE ? OR p.sku LIKE ? OR i.color LIKE ?)`;
    values.push(term, term, term, term, term);
  }
  return { where, values };
};

const legacyConditionStatus = (status, condition) => {
  if (status === 'RETIRED') return 'retired';
  if (status === 'RENTED') return 'rented';
  if (status === 'DAMAGED' || status === 'LOST' || condition === 'DAMAGED') return 'damaged';
  if (['INSPECTION', 'CLEANING', 'ALTERATION', 'REPAIR'].includes(status)) return 'maintenance';
  return 'available';
};

export const findActiveProductForShop = async (shopId, productId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT id, shop_id, name, sku FROM products
     WHERE id = ? AND shop_id = ? AND is_deleted = 0 AND status = 'active' LIMIT 1`,
    [productId, shopId],
  );
  return rows[0] || null;
};

export const findInventoryBySku = async (shopId, sku, excludeId) => {
  const values = [shopId, sku];
  let query = 'SELECT id FROM inventory_items WHERE shop_id = ? AND item_code = ?';
  if (excludeId) {
    query += ' AND id <> ?';
    values.push(excludeId);
  }
  const [rows] = await pool.query(`${query} LIMIT 1`, values);
  return rows[0] || null;
};

export const findInventoryByBarcode = async (shopId, barcode, excludeId) => {
  const values = [shopId, barcode];
  let query = 'SELECT id FROM inventory_items WHERE shop_id = ? AND barcode = ?';
  if (excludeId) {
    query += ' AND id <> ?';
    values.push(excludeId);
  }
  const [rows] = await pool.query(`${query} LIMIT 1`, values);
  return rows[0] || null;
};

export const findInventoryItemsByShop = async (shopId, options = {}, connection = pool) => {
  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(options.limit) || 20)));
  const offset = (page - 1) * limit;
  const { where, values } = buildFilters(shopId, options);
  const sortBy = INVENTORY_SORT_COLUMNS[options.sortBy] || INVENTORY_SORT_COLUMNS.createdAt;
  const sortOrder = String(options.sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const [rows] = await connection.query(
    `${inventorySelect} WHERE ${where} ORDER BY ${sortBy} ${sortOrder}, i.id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );
  return rows.map(mapInventoryRow);
};

export const countInventoryItemsByShop = async (shopId, options = {}, connection = pool) => {
  const { where, values } = buildFilters(shopId, options);
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total FROM inventory_items i
     INNER JOIN products p ON p.id = i.product_id AND p.shop_id = i.shop_id
     LEFT JOIN categories c ON c.id = p.category_id AND c.shop_id = p.shop_id
     WHERE ${where}`,
    values,
  );
  return Number(rows[0]?.total || 0);
};

export const findInventoryItemById = async (shopId, itemId, connection = pool) => {
  const [rows] = await connection.query(
    `${inventorySelect} WHERE i.id = ? AND i.shop_id = ? AND i.is_deleted = 0 LIMIT 1`,
    [itemId, shopId],
  );
  return rows[0] ? mapInventoryRow(rows[0]) : null;
};

export const summarizeInventoryByShop = async (shopId, filters = {}, connection = pool) => {
  const values = [shopId];
  let where = 'i.shop_id = ? AND i.is_deleted = 0';
  if (filters.productId) {
    where += ' AND i.product_id = ?';
    values.push(filters.productId);
  }
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE i.status = 'AVAILABLE') AS available,
      COUNT(*) FILTER (WHERE i.status = 'RESERVED') AS reserved,
      COUNT(*) FILTER (WHERE i.status = 'RENTED') AS rented,
      COUNT(*) FILTER (WHERE i.status = 'RETURNED') AS returned,
      COUNT(*) FILTER (WHERE i.status = 'INSPECTION') AS inspection,
      COUNT(*) FILTER (WHERE i.status = 'CLEANING') AS cleaning,
      COUNT(*) FILTER (WHERE i.status = 'ALTERATION') AS alteration,
      COUNT(*) FILTER (WHERE i.status = 'REPAIR') AS repair,
      COUNT(*) FILTER (WHERE i.status = 'DAMAGED') AS damaged,
      COUNT(*) FILTER (WHERE i.status = 'LOST') AS lost,
      COUNT(*) FILTER (WHERE i.status = 'RETIRED') AS retired,
      COUNT(*) FILTER (WHERE i.status IN ('INSPECTION', 'CLEANING', 'ALTERATION', 'REPAIR')) AS maintenance
     FROM inventory_items i
     INNER JOIN products p ON p.id = i.product_id AND p.shop_id = i.shop_id
     WHERE ${where}`,
    values,
  );
  return Object.fromEntries(Object.entries(rows[0] || {}).map(([key, value]) => [key, Number(value || 0)]));
};

export const findInventoryAuditHistory = async (shopId, itemId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT action, old_values, new_values, user_id, created_at
     FROM audit_logs WHERE shop_id = ? AND entity_type = 'inventory_item' AND entity_id = ?
     ORDER BY created_at DESC, id DESC LIMIT 50`,
    [shopId, itemId],
  );
  return rows.map((row) => ({
    action: row.action,
    oldValues: typeof row.old_values === 'string' ? JSON.parse(row.old_values) : row.old_values,
    newValues: typeof row.new_values === 'string' ? JSON.parse(row.new_values) : row.new_values,
    userId: row.user_id,
    createdAt: row.created_at,
  }));
};

export const createInventoryRecord = async (shopId, payload, audit) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO inventory_items
      (shop_id, product_id, item_code, barcode, qr_code, size, color, condition_status, status, physical_condition, acquired_at, purchase_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, ?, ?)`,
      [shopId, payload.productId, payload.sku, payload.barcode || null, payload.qrCode || null, payload.size || null, payload.color || null,
        legacyConditionStatus('AVAILABLE', payload.condition), payload.condition, payload.purchaseDate || null, payload.purchaseDate || null, payload.notes || null],
    );
    const item = await findInventoryItemById(shopId, result.insertId, connection);
    await createAuditLog({ ...audit, shopId, entityType: 'inventory_item', entityId: result.insertId, action: 'CREATE_INVENTORY', newValues: item }, connection);
    await connection.commit();
    return item;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateInventoryRecord = async (shopId, itemId, payload, audit) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const previous = await findInventoryItemById(shopId, itemId, connection);
    if (!previous) {
      await connection.rollback();
      return null;
    }
    await connection.query(
      `UPDATE inventory_items SET item_code = ?, barcode = ?, qr_code = ?, size = ?, color = ?,
      physical_condition = ?, condition_status = ?, acquired_at = ?, purchase_date = ?, notes = ?
       WHERE id = ? AND shop_id = ? AND is_deleted = 0`,
      [payload.sku, payload.barcode || null, payload.qrCode || null, payload.size || null, payload.color || null,
        payload.condition, legacyConditionStatus(previous.status, payload.condition), payload.purchaseDate || null, payload.purchaseDate || null, payload.notes || null, itemId, shopId],
    );
    const item = await findInventoryItemById(shopId, itemId, connection);
    await createAuditLog({ ...audit, shopId, entityType: 'inventory_item', entityId: itemId, action: 'UPDATE_INVENTORY', oldValues: previous, newValues: item }, connection);
    await connection.commit();
    return item;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateInventoryStatusRecord = async (shopId, itemId, status, audit) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const previous = await findInventoryItemById(shopId, itemId, connection);
    if (!previous) {
      await connection.rollback();
      return null;
    }
    await connection.query(
      'UPDATE inventory_items SET status = ?, condition_status = ? WHERE id = ? AND shop_id = ? AND is_deleted = 0',
      [status, legacyConditionStatus(status, previous.condition), itemId, shopId],
    );
    const item = await findInventoryItemById(shopId, itemId, connection);
    await createAuditLog({ ...audit, shopId, entityType: 'inventory_item', entityId: itemId, action: status === 'RETIRED' ? 'RETIRE_INVENTORY' : 'CHANGE_INVENTORY_STATUS', oldValues: { status: previous.status }, newValues: { status: item.status } }, connection);
    await connection.commit();
    return item;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateInventoryConditionRecord = async (shopId, itemId, condition, audit) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const previous = await findInventoryItemById(shopId, itemId, connection);
    if (!previous) {
      await connection.rollback();
      return null;
    }
    await connection.query(
      'UPDATE inventory_items SET physical_condition = ?, condition_status = ? WHERE id = ? AND shop_id = ? AND is_deleted = 0',
      [condition, legacyConditionStatus(previous.status, condition), itemId, shopId],
    );
    const item = await findInventoryItemById(shopId, itemId, connection);
    await createAuditLog({ ...audit, shopId, entityType: 'inventory_item', entityId: itemId, action: 'CHANGE_INVENTORY_CONDITION', oldValues: { condition: previous.condition }, newValues: { condition: item.condition } }, connection);
    await connection.commit();
    return item;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};