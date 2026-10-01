import { randomUUID } from 'node:crypto';
import { pool } from '../config/database.js';

const bookingSortColumns = {
  bookingDate: 'b.booking_date',
  rentalStartDate: 'b.rental_start_date',
  createdAt: 'b.created_at',
  totalAmount: 'b.total_amount',
};

const mapCustomer = (row) => ({
  id: row.customer_id,
  firstName: row.first_name,
  lastName: row.last_name,
  name: [row.first_name, row.last_name].filter(Boolean).join(' '),
  phone: row.phone,
  email: row.email,
});

const mapBookingItem = (row) => ({
  id: row.id,
  status: String(row.booking_item_status || '').toUpperCase(),
  productId: row.product_id,
  inventoryItemId: row.inventory_item_id,
  product: {
    id: row.product_id,
    name: row.product_name,
    sku: row.product_sku,
  },
  inventoryItem: row.inventory_item_id ? {
    id: row.inventory_item_id,
    sku: row.inventory_sku,
    size: row.size,
    color: row.color,
    condition: row.physical_condition,
    status: row.inventory_status,
  } : null,
  dailyRentalRate: row.unit_rental_rate,
  rentalPrice: row.rental_price,
  depositAmount: row.deposit_amount,
  discountAmount: row.discount_amount,
  taxAmount: row.tax_amount,
  totalAmount: row.total_amount,
  notes: row.notes,
});

const mapBooking = (row, items = []) => ({
  id: row.id,
  shopId: row.shop_id,
  bookingNumber: row.booking_number,
  bookingDate: row.booking_date,
  rentalStartDate: row.rental_start_date,
  rentalEndDate: row.rental_end_date,
  status: String(row.status || '').toUpperCase(),
  customer: mapCustomer(row),
  itemCount: Number(row.item_count ?? items.length),
  subtotal: row.subtotal,
  discountAmount: row.discount_amount,
  taxAmount: row.tax_amount,
  depositAmount: row.deposit_amount,
  totalAmount: row.total_amount,
  paidAmount: row.paid_amount,
  balanceAmount: row.balance_amount,
  pickedUpAt: row.picked_up_at,
  pickedUpBy: row.picked_up_by_user_id,
  pickupNotes: row.pickup_notes,
  returnedAt: row.returned_at,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...(items.length ? { items } : {}),
});

export const findActiveBookingCustomer = async (shopId, customerId, connection = pool, lock = false) => {
  const [rows] = await connection.query(
    `SELECT id, shop_id, first_name, last_name, phone, email, status
     FROM customers WHERE id = ? AND shop_id = ? AND status = 'active' AND is_deleted = 0 LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [customerId, shopId],
  );
  return rows[0] || null;
};

export const findBookingForUpdate = async (shopId, bookingId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT id, shop_id, customer_id, status, rental_start_date, rental_end_date, picked_up_at
     FROM bookings WHERE id = ? AND shop_id = ? AND is_deleted = 0 LIMIT 1 FOR UPDATE`,
    [bookingId, shopId],
  );
  return rows[0] || null;
};

const insertBookingItems = async (shopId, bookingId, items, connection) => {
  for (const item of items) {
    await connection.query(
      `INSERT INTO booking_items
        (shop_id, booking_id, product_id, inventory_item_id, quantity, unit_rental_rate, rental_price,
         subtotal, deposit_amount, discount_amount, tax_amount, total_amount, status, notes)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [shopId, bookingId, item.productId, item.inventoryItemId, item.dailyRentalRate,
        item.rentalPrice, item.rentalPrice, item.depositAmount, item.discountAmount,
        item.taxAmount, item.totalAmount, item.notes || null],
    );
  }
};

export const createBookingRecord = async (shopId, userId, payload, pricing, connection = pool) => {
  const temporaryNumber = `TMP-${randomUUID()}`;
  const [result] = await connection.query(
    `INSERT INTO bookings
      (shop_id, customer_id, created_by_user_id, booking_number, rental_start_date, rental_end_date,
       status, rental_amount, subtotal, deposit_amount, discount_amount, tax_amount, total_amount,
       paid_amount, balance_amount, notes)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [shopId, payload.customerId, userId || null, temporaryNumber, payload.rentalStartDate, payload.rentalEndDate,
      pricing.totalAmount, pricing.subtotal, pricing.depositAmount, pricing.discountAmount,
      pricing.taxAmount, pricing.totalAmount, pricing.balanceAmount, payload.notes || null],
  );
  const bookingNumber = `BK-${new Date().getUTCFullYear()}-${String(result.insertId).padStart(5, '0')}`;
  await connection.query('UPDATE bookings SET booking_number = ? WHERE id = ? AND shop_id = ?', [bookingNumber, result.insertId, shopId]);
  await insertBookingItems(shopId, result.insertId, pricing.items, connection);
  return result.insertId;
};

export const updateBookingRecord = async (shopId, bookingId, payload, pricing, connection = pool) => {
  await connection.query(
    `UPDATE bookings SET customer_id = ?, rental_start_date = ?, rental_end_date = ?, rental_amount = ?,
      subtotal = ?, deposit_amount = ?, discount_amount = ?, tax_amount = ?, total_amount = ?,
      balance_amount = ? + ? - paid_amount, notes = ? WHERE id = ? AND shop_id = ? AND is_deleted = 0`,
    [payload.customerId, payload.rentalStartDate, payload.rentalEndDate, pricing.totalAmount,
      pricing.subtotal, pricing.depositAmount, pricing.discountAmount, pricing.taxAmount,
      pricing.totalAmount, pricing.totalAmount, pricing.depositAmount, payload.notes || null, bookingId, shopId],
  );
  await connection.query(
    'UPDATE booking_items SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE booking_id = ? AND shop_id = ? AND is_deleted = 0',
    [bookingId, shopId],
  );
  await insertBookingItems(shopId, bookingId, pricing.items, connection);
  return true;
};

export const updateBookingStatusRecord = async (shopId, bookingId, status, connection = pool) => {
  await connection.query('UPDATE bookings SET status = ? WHERE id = ? AND shop_id = ? AND is_deleted = 0', [status, bookingId, shopId]);
};

export const findBookingInventoryIds = async (shopId, bookingId, connection = pool, lock = false) => {
  const [rows] = await connection.query(
    `SELECT inventory_item_id FROM booking_items
     WHERE booking_id = ? AND shop_id = ? AND is_deleted = 0 AND inventory_item_id IS NOT NULL${lock ? ' FOR UPDATE' : ''}`,
    [bookingId, shopId],
  );
  return rows.map((row) => row.inventory_item_id);
};

// Format rental dates for API responses.
const bookingColumns = `b.id, b.shop_id, b.customer_id, b.booking_number,
  TO_CHAR(b.rental_start_date, 'YYYY-MM-DD') AS rental_start_date,
  TO_CHAR(b.rental_end_date, 'YYYY-MM-DD') AS rental_end_date,
  b.booking_date, b.status, b.picked_up_at, b.picked_up_by_user_id, b.pickup_notes, b.returned_at,
  b.subtotal, b.discount_amount, b.tax_amount, b.deposit_amount,
  b.total_amount, b.paid_amount, b.balance_amount, b.notes, b.created_at, b.updated_at,
  c.first_name, c.last_name, c.phone, c.email`;

export const findBookingById = async (shopId, bookingId, connection = pool, lock = false) => {
  const [rows] = await connection.query(
    `SELECT ${bookingColumns} FROM bookings b
     INNER JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
     WHERE b.id = ? AND b.shop_id = ? AND b.is_deleted = 0 LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [bookingId, shopId],
  );
  if (!rows[0]) return null;
  const [itemRows] = await connection.query(
    `SELECT bi.id, bi.status AS booking_item_status, bi.product_id, bi.inventory_item_id, bi.unit_rental_rate, bi.rental_price,
      bi.deposit_amount, bi.discount_amount, bi.tax_amount, bi.total_amount, bi.notes,
      p.name AS product_name, p.sku AS product_sku, i.item_code AS inventory_sku,
      i.size, i.color, i.physical_condition, i.status AS inventory_status
     FROM booking_items bi
     INNER JOIN products p ON p.id = bi.product_id AND p.shop_id = bi.shop_id
     LEFT JOIN inventory_items i ON i.id = bi.inventory_item_id AND i.shop_id = bi.shop_id
     WHERE bi.booking_id = ? AND bi.shop_id = ? AND bi.is_deleted = 0 ORDER BY bi.id${lock ? ' FOR UPDATE' : ''}`,
    [bookingId, shopId],
  );
  return mapBooking(rows[0], itemRows.map(mapBookingItem));
};

const listWhere = (shopId, options) => {
  const values = [shopId];
  let where = 'b.shop_id = ? AND b.is_deleted = 0';
  if (options.status) {
    where += ' AND b.status = ?';
    values.push(options.status);
  }
  if (options.customerId) {
    where += ' AND b.customer_id = ?';
    values.push(options.customerId);
  }
  if (options.bookingDate) {
    // PostgreSQL: cast timestamptz to date
    where += ' AND b.booking_date::DATE = ?';
    values.push(options.bookingDate);
  }
  if (options.startDate) {
    where += ' AND b.rental_end_date >= ?';
    values.push(options.startDate);
  }
  if (options.endDate) {
    where += ' AND b.rental_start_date <= ?';
    values.push(options.endDate);
  }
  if (options.search) {
    const term = `%${options.search.toLowerCase()}%`;
    where += ` AND (LOWER(b.booking_number) LIKE ? OR LOWER(c.first_name) LIKE ?
      OR LOWER(c.last_name) LIKE ? OR LOWER(CONCAT(c.first_name, ' ', COALESCE(c.last_name, ''))) LIKE ?
      OR LOWER(c.phone) LIKE ?)`;
    values.push(term, term, term, term, term);
  }
  return { where, values };
};

export const countBookingsByShop = async (shopId, options, connection = pool) => {
  const { where, values } = listWhere(shopId, options);
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total FROM bookings b
     INNER JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id WHERE ${where}`,
    values,
  );
  return Number(rows[0]?.total || 0);
};

export const findBookingsByShop = async (shopId, options, connection = pool) => {
  const { where, values } = listWhere(shopId, options);
  const sortBy = bookingSortColumns[options.sortBy] || bookingSortColumns.createdAt;
  const sortOrder = String(options.sortOrder || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const [rows] = await connection.query(
    `SELECT ${bookingColumns},
      (SELECT COUNT(*) FROM booking_items count_items WHERE count_items.booking_id = b.id
       AND count_items.shop_id = b.shop_id AND count_items.is_deleted = 0) AS item_count
     FROM bookings b
     INNER JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
     WHERE ${where} ORDER BY ${sortBy} ${sortOrder}, b.id DESC LIMIT ? OFFSET ?`,
    [...values, options.limit, options.offset],
  );
  return rows.map((row) => mapBooking(row));
};

export const getBookingSummaryByShop = async (shopId, currentDate, connection = pool) => {
  // FILTER keeps each booking count scoped to its matching status and date rules.
  const [rows] = await connection.query(
    `SELECT
      COUNT(*) FILTER (WHERE status IN ('PENDING', 'CONFIRMED', 'READY') AND rental_start_date > ?) AS upcoming,
      COUNT(*) FILTER (WHERE status IN ('PENDING', 'CONFIRMED', 'READY', 'ACTIVE') AND rental_start_date <= ? AND rental_end_date >= ?) AS today,
      COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active,
      COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
      COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed
     FROM bookings WHERE shop_id = ? AND is_deleted = 0`,
    [currentDate, currentDate, currentDate, shopId],
  );
  return Object.fromEntries(Object.entries(rows[0] || {}).map(([key, value]) => [key, Number(value || 0)]));
};

export const findBookingAuditHistory = async (shopId, bookingId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT action, old_values, new_values, user_id, created_at FROM audit_logs
     WHERE shop_id = ? AND entity_type = 'booking' AND entity_id = ?
     ORDER BY created_at DESC, id DESC LIMIT 50`,
    [shopId, bookingId],
  );
  return rows.map((row) => ({
    action: row.action,
    oldValues: typeof row.old_values === 'string' ? JSON.parse(row.old_values) : row.old_values,
    newValues: typeof row.new_values === 'string' ? JSON.parse(row.new_values) : row.new_values,
    userId: row.user_id,
    createdAt: row.created_at,
  }));
};
