import { pool } from '../config/database.js';
import { BLOCKING_BOOKING_STATUSES } from '../constants/booking.constants.js';

const inventorySelect = `SELECT i.id, i.shop_id, i.product_id, i.item_code AS sku, i.size, i.color,
  i.status, i.physical_condition, p.name AS product_name, p.sku AS product_sku,
  p.daily_rental_rate, p.security_deposit
  FROM inventory_items i
  INNER JOIN products p ON p.id = i.product_id AND p.shop_id = i.shop_id
  WHERE i.shop_id = ? AND i.is_deleted = 0 AND p.is_deleted = 0 AND p.status = 'active'`;

export const findAvailabilityInventoryItem = async (shopId, inventoryItemId, connection = pool, lock = false) => {
  const [rows] = await connection.query(
    `${inventorySelect} AND i.id = ? LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [shopId, inventoryItemId],
  );
  return rows[0] || null;
};

export const findAvailabilityInventoryItems = async (shopId, inventoryItemIds, connection = pool, lock = false) => {
  if (!inventoryItemIds.length) return [];
  const placeholders = inventoryItemIds.map(() => '?').join(', ');
  const [rows] = await connection.query(
    `${inventorySelect} AND i.id IN (${placeholders}) ORDER BY i.id${lock ? ' FOR UPDATE' : ''}`,
    [shopId, ...inventoryItemIds],
  );
  return rows;
};

export const findRentableInventoryForProduct = async (shopId, productId, connection = pool) => {
  const [rows] = await connection.query(
    `${inventorySelect} AND p.id = ? AND i.status = 'AVAILABLE'
      AND i.physical_condition <> 'DAMAGED' ORDER BY i.size, i.item_code`,
    [shopId, productId],
  );
  return rows;
};

export const findRentableInventoryForShop = async (shopId, options = {}, connection = pool) => {
  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(options.limit) || 50)));
  const offset = (page - 1) * limit;
  const values = [shopId];
  let where = `i.shop_id = ? AND i.is_deleted = 0 AND p.is_deleted = 0 AND p.status = 'active'
    AND i.status = 'AVAILABLE' AND i.physical_condition <> 'DAMAGED'`;
  if (options.categoryId) {
    where += ' AND p.category_id = ?';
    values.push(options.categoryId);
  }
  if (options.search) {
    const term = `%${String(options.search).trim()}%`;
    where += ` AND (i.item_code ILIKE ? OR i.barcode ILIKE ? OR p.name ILIKE ?
      OR p.sku ILIKE ? OR i.size ILIKE ? OR i.color ILIKE ?)`;
    values.push(term, term, term, term, term, term);
  }
  if (options.size) {
    where += ' AND i.size ILIKE ?';
    values.push(`%${options.size}%`);
  }
  if (options.color) {
    where += ' AND i.color ILIKE ?';
    values.push(`%${options.color}%`);
  }
  const [rows] = await connection.query(
    `SELECT i.id, i.shop_id, i.product_id, i.item_code AS sku, i.size, i.color,
       i.status, i.physical_condition, p.name AS product_name, p.sku AS product_sku,
       p.daily_rental_rate, p.security_deposit
     FROM inventory_items i
     INNER JOIN products p ON p.id = i.product_id AND p.shop_id = i.shop_id
     WHERE ${where}
     ORDER BY p.name, i.size, i.item_code, i.id LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );
  const [countRows] = await connection.query(
    `SELECT COUNT(*) AS total FROM inventory_items i
     INNER JOIN products p ON p.id = i.product_id AND p.shop_id = i.shop_id
     WHERE ${where}`,
    values,
  );
  return { rows, totalItems: Number(countRows[0]?.total || 0), page, limit };
};

export const findAvailabilityProduct = async (shopId, productId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT id, sku, name, daily_rental_rate, security_deposit
     FROM products WHERE id = ? AND shop_id = ? AND status = 'active' AND is_deleted = 0 LIMIT 1`,
    [productId, shopId],
  );
  return rows[0] || null;
};

export const findAvailabilityConflicts = async (
  shopId,
  inventoryItemIds,
  dateRange,
  excludeBookingId,
  connection = pool,
  lock = false,
) => {
  if (!inventoryItemIds.length) return [];
  const placeholders = inventoryItemIds.map(() => '?').join(', ');
  const values = [shopId, ...inventoryItemIds, ...BLOCKING_BOOKING_STATUSES, dateRange.endDate, dateRange.startDate];
  let where = `b.shop_id = ? AND bi.inventory_item_id IN (${placeholders})
    AND bi.shop_id = b.shop_id AND bi.is_deleted = 0 AND b.is_deleted = 0
    AND b.status IN (${BLOCKING_BOOKING_STATUSES.map(() => '?').join(', ')})
    AND b.rental_start_date <= ? AND b.rental_end_date >= ?`;
  if (excludeBookingId) {
    where += ' AND b.id <> ?';
    values.push(excludeBookingId);
  }
  const [rows] = await connection.query(
    `SELECT bi.inventory_item_id, b.id AS booking_id, b.booking_number,
      TO_CHAR(b.rental_start_date, 'YYYY-MM-DD') AS rental_start_date,
      TO_CHAR(b.rental_end_date, 'YYYY-MM-DD') AS rental_end_date, b.status
     FROM booking_items bi
     INNER JOIN bookings b ON b.id = bi.booking_id
     WHERE ${where}
     ORDER BY b.rental_start_date, b.id${lock ? ' FOR UPDATE' : ''}`,
    values,
  );
  return rows;
};

export const findEditableBookingForAvailability = async (shopId, bookingId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT id FROM bookings WHERE id = ? AND shop_id = ? AND is_deleted = 0
      AND status IN ('DRAFT', 'PENDING', 'CONFIRMED') LIMIT 1`,
    [bookingId, shopId],
  );
  return rows[0] || null;
};