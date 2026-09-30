import { randomUUID } from 'node:crypto';
import { pool } from '../config/database.js';
import { PAYMENT_SORT_COLUMNS } from '../constants/payment.constants.js';

const mapPayment = (row = {}) => ({
  id: row.id,
  shopId: row.shop_id,
  paymentReference: row.payment_number,
  bookingId: row.booking_id,
  bookingNumber: row.booking_number,
  customer: row.customer_id ? {
    id: row.customer_id,
    name: [row.first_name, row.last_name].filter(Boolean).join(' '),
    phone: row.phone,
    email: row.email,
  } : null,
  amount: row.amount,
  refundedAmount: row.refunded_amount,
  paymentType: String(row.payment_type || 'OTHER').toUpperCase(),
  paymentMethod: String(row.payment_method || '').toUpperCase(),
  status: String(row.status || '').toUpperCase(),
  transactionDate: row.transaction_date,
  notes: row.notes,
  createdBy: row.created_by_user_id,
  createdAt: row.created_at,
  cancelledBy: row.cancelled_by_user_id,
  cancelledAt: row.cancelled_at,
  cancellationReason: row.cancellation_reason,
});

export const findBookingForPayment = async (shopId, bookingId, connection = pool, lock = false) => {
  const [rows] = await connection.query(
    `SELECT b.id, b.shop_id, b.customer_id, b.status, b.total_amount, b.deposit_amount,
      b.paid_amount, b.balance_amount, b.booking_number, c.first_name, c.last_name, c.phone, c.email
     FROM bookings b
     INNER JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
     WHERE b.id = ? AND b.shop_id = ? AND b.is_deleted = 0 AND c.is_deleted = 0 LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [bookingId, shopId],
  );
  return rows[0] || null;
};

export const findPaymentBookingId = async (shopId, paymentId, connection = pool) => {
  const [rows] = await connection.query(
    'SELECT booking_id FROM payments WHERE id = ? AND shop_id = ? AND is_deleted = 0 LIMIT 1 FOR UPDATE',
    [paymentId, shopId],
  );
  return rows[0]?.booking_id || null;
};

export const sumBookingPayments = async (shopId, bookingId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT
      COALESCE(SUM(CASE WHEN status IN ('SUCCESS', 'PARTIALLY_REFUNDED') THEN amount - refunded_amount ELSE 0 END), 0) AS net_paid,
      COALESCE(SUM(CASE WHEN status IN ('REFUNDED', 'PARTIALLY_REFUNDED') THEN refunded_amount ELSE 0 END), 0) AS refunded
     FROM payments WHERE shop_id = ? AND booking_id = ? AND is_deleted = 0`,
    [shopId, bookingId],
  );
  return rows[0] || { net_paid: '0.00', refunded: '0.00' };
};

export const createPaymentRecord = async (shopId, userId, booking, payload, amount, connection = pool) => {
  const temporaryNumber = `TMP-${randomUUID()}`;
  const [result] = await connection.query(
    `INSERT INTO payments
      (shop_id, booking_id, customer_id, payment_number, payment_method, amount, refunded_amount,
       payment_type, status, transaction_date, created_by_user_id, paid_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, 'SUCCESS', ?, ?, CURRENT_TIMESTAMP, ?)`,
    [shopId, booking.id, booking.customer_id, temporaryNumber, payload.paymentMethod, amount,
      payload.paymentType, payload.transactionDate, userId || null, payload.notes || null],
  );
  const paymentReference = `PAY-${new Date().getUTCFullYear()}-${String(result.insertId).padStart(5, '0')}`;
  await connection.query(
    'UPDATE payments SET payment_number = ? WHERE id = ? AND shop_id = ?',
    [paymentReference, result.insertId, shopId],
  );
  return result.insertId;
};

export const updateBookingPaymentSnapshot = async (shopId, bookingId, paidAmount, balanceAmount, connection = pool) => {
  await connection.query(
    `UPDATE bookings SET paid_amount = ?, balance_amount = ?
     WHERE id = ? AND shop_id = ? AND is_deleted = 0`,
    [paidAmount, balanceAmount, bookingId, shopId],
  );
};

export const findPaymentForUpdate = async (shopId, paymentId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT id, shop_id, booking_id, customer_id, payment_number, payment_method, amount,
      refunded_amount, payment_type, status, transaction_date, notes, created_by_user_id,
      cancelled_by_user_id, cancelled_at, cancellation_reason
     FROM payments WHERE id = ? AND shop_id = ? AND is_deleted = 0 LIMIT 1 FOR UPDATE`,
    [paymentId, shopId],
  );
  return rows[0] || null;
};

export const cancelPaymentRecord = async (shopId, paymentId, userId, reason, connection = pool) => {
  await connection.query(
    `UPDATE payments SET status = 'CANCELLED', cancelled_by_user_id = ?,
      cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = ?
     WHERE id = ? AND shop_id = ? AND is_deleted = 0`,
    [userId || null, reason, paymentId, shopId],
  );
};

export const updatePaymentStatusRecord = async (shopId, paymentId, status, connection = pool) => {
  await connection.query(
    'UPDATE payments SET status = ? WHERE id = ? AND shop_id = ? AND is_deleted = 0',
    [status, paymentId, shopId],
  );
};

const paymentSelect = `p.id, p.shop_id, p.booking_id, p.customer_id, p.payment_number,
  p.payment_method, p.amount, p.refunded_amount, p.payment_type, p.status, p.transaction_date,
  p.notes, p.created_by_user_id, p.cancelled_by_user_id, p.cancelled_at, p.cancellation_reason,
  p.created_at, b.booking_number, c.first_name, c.last_name, c.phone, c.email`;

export const findPaymentById = async (shopId, paymentId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT ${paymentSelect} FROM payments p
     LEFT JOIN bookings b ON b.id = p.booking_id AND b.shop_id = p.shop_id
     INNER JOIN customers c ON c.id = p.customer_id AND c.shop_id = p.shop_id
     WHERE p.id = ? AND p.shop_id = ? AND p.is_deleted = 0 LIMIT 1`,
    [paymentId, shopId],
  );
  return rows[0] ? mapPayment(rows[0]) : null;
};

const buildPaymentWhere = (shopId, options = {}) => {
  const values = [shopId];
  let where = 'p.shop_id = ? AND p.is_deleted = 0';
  if (options.status) { where += ' AND p.status = ?'; values.push(options.status); }
  if (options.paymentMethod) { where += ' AND p.payment_method = ?'; values.push(options.paymentMethod); }
  if (options.paymentType) { where += ' AND p.payment_type = ?'; values.push(options.paymentType); }
  if (options.bookingId) { where += ' AND p.booking_id = ?'; values.push(options.bookingId); }
  if (options.customerId) { where += ' AND p.customer_id = ?'; values.push(options.customerId); }
  if (options.startDate) { where += ' AND p.transaction_date >= ?'; values.push(options.startDate); }
  if (options.endDate) { where += ' AND p.transaction_date <= ?'; values.push(options.endDate); }
  if (options.search) {
    const term = `%${options.search.toLowerCase()}%`;
    where += ` AND (LOWER(p.payment_number) LIKE ? OR LOWER(b.booking_number) LIKE ?
      OR LOWER(c.first_name) LIKE ? OR LOWER(c.last_name) LIKE ?
      OR LOWER(CONCAT(c.first_name, ' ', COALESCE(c.last_name, ''))) LIKE ? OR LOWER(c.phone) LIKE ?)`;
    values.push(term, term, term, term, term, term);
  }
  return { where, values };
};

export const countPaymentsByShop = async (shopId, options, connection = pool) => {
  const { where, values } = buildPaymentWhere(shopId, options);
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total FROM payments p
     LEFT JOIN bookings b ON b.id = p.booking_id AND b.shop_id = p.shop_id
     INNER JOIN customers c ON c.id = p.customer_id AND c.shop_id = p.shop_id WHERE ${where}`,
    values,
  );
  return Number(rows[0]?.total || 0);
};

export const findPaymentsByShop = async (shopId, options, connection = pool) => {
  const { where, values } = buildPaymentWhere(shopId, options);
  const sortBy = PAYMENT_SORT_COLUMNS[options.sortBy] || PAYMENT_SORT_COLUMNS.transactionDate;
  const sortOrder = String(options.sortOrder || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const [rows] = await connection.query(
    `SELECT ${paymentSelect} FROM payments p
     LEFT JOIN bookings b ON b.id = p.booking_id AND b.shop_id = p.shop_id
     INNER JOIN customers c ON c.id = p.customer_id AND c.shop_id = p.shop_id
     WHERE ${where} ORDER BY ${sortBy} ${sortOrder}, p.id DESC LIMIT ? OFFSET ?`,
    [...values, options.limit, options.offset],
  );
  return rows.map(mapPayment);
};

export const getPaymentSummaryByShop = async (shopId, options = {}, connection = pool) => {
  const values = [shopId];
  let where = 'shop_id = ? AND is_deleted = 0';
  if (options.startDate) { where += ' AND transaction_date >= ?'; values.push(options.startDate); }
  if (options.endDate) { where += ' AND transaction_date <= ?'; values.push(options.endDate); }
  if (options.paymentMethod) { where += ' AND payment_method = ?'; values.push(options.paymentMethod); }
  if (options.paymentType) { where += ' AND payment_type = ?'; values.push(options.paymentType); }
  const [rows] = await connection.query(
    `SELECT
      (SELECT COALESCE(SUM(CASE WHEN today_payment.status IN ('SUCCESS', 'PARTIALLY_REFUNDED', 'REFUNDED') THEN today_payment.amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN today_payment.status IN ('REFUNDED', 'PARTIALLY_REFUNDED') THEN today_payment.refunded_amount ELSE 0 END), 0)
       FROM payments today_payment
       WHERE today_payment.shop_id = ? AND today_payment.transaction_date = CURRENT_DATE AND today_payment.is_deleted = 0) AS today_collected,
      COALESCE(SUM(CASE WHEN status IN ('SUCCESS', 'PARTIALLY_REFUNDED', 'REFUNDED') THEN amount ELSE 0 END), 0) AS total_collected,
      COALESCE(SUM(CASE WHEN status IN ('REFUNDED', 'PARTIALLY_REFUNDED') THEN refunded_amount ELSE 0 END), 0) AS total_refunded,
      COALESCE(SUM(CASE WHEN status IN ('SUCCESS', 'PARTIALLY_REFUNDED', 'REFUNDED') THEN amount ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN status IN ('REFUNDED', 'PARTIALLY_REFUNDED') THEN refunded_amount ELSE 0 END), 0) AS net_collected,
      SUM(status = 'SUCCESS') AS successful_count,
      SUM(status = 'PENDING') AS pending_count,
      SUM(status IN ('SUCCESS', 'PARTIALLY_REFUNDED', 'REFUNDED')) AS payment_count
     FROM payments WHERE ${where}`,
    [shopId, ...values],
  );
  const row = rows[0] || {};
  return {
    todayCollected: row.today_collected,
    totalCollected: row.total_collected,
    totalRefunded: row.total_refunded,
    netCollected: row.net_collected,
    successfulCount: Number(row.successful_count || 0),
    pendingCount: Number(row.pending_count || 0),
    paymentCount: Number(row.payment_count || 0),
  };
};

export const getCustomerPaymentSummary = async (shopId, customerId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT
      c.id AS customer_id,
      (SELECT COALESCE(SUM(CASE WHEN p.status IN ('SUCCESS', 'PARTIALLY_REFUNDED') THEN p.amount - p.refunded_amount ELSE 0 END), 0)
       FROM payments p WHERE p.customer_id = c.id AND p.shop_id = c.shop_id AND p.is_deleted = 0) AS total_paid,
      (SELECT COALESCE(SUM(b.balance_amount), 0) FROM bookings b
       WHERE b.customer_id = c.id AND b.shop_id = c.shop_id AND b.is_deleted = 0) AS outstanding,
      (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id AND b.shop_id = c.shop_id AND b.is_deleted = 0) AS booking_count
     FROM customers c
     WHERE c.id = ? AND c.shop_id = ? AND c.is_deleted = 0`,
    [customerId, shopId],
  );
  const row = rows[0] || {};
  return { customerExists: Boolean(row.customer_id), totalPaid: row.total_paid || '0.00', outstanding: row.outstanding || '0.00', totalBookings: Number(row.booking_count || 0) };
};

export const findBookingPayments = async (shopId, bookingId, options, connection = pool) => {
  const values = [shopId, bookingId];
  let where = 'p.shop_id = ? AND p.booking_id = ? AND p.is_deleted = 0';
  if (options.status) { where += ' AND p.status = ?'; values.push(options.status); }
  if (options.paymentMethod) { where += ' AND p.payment_method = ?'; values.push(options.paymentMethod); }
  if (options.startDate) { where += ' AND p.transaction_date >= ?'; values.push(options.startDate); }
  if (options.endDate) { where += ' AND p.transaction_date <= ?'; values.push(options.endDate); }
  const [rows] = await connection.query(
    `SELECT ${paymentSelect} FROM payments p
     LEFT JOIN bookings b ON b.id = p.booking_id AND b.shop_id = p.shop_id
     INNER JOIN customers c ON c.id = p.customer_id AND c.shop_id = p.shop_id
     WHERE ${where} ORDER BY p.transaction_date DESC, p.id DESC LIMIT ? OFFSET ?`,
    [...values, options.limit, options.offset],
  );
  return rows.map(mapPayment);
};

export const countBookingPayments = async (shopId, bookingId, options, connection = pool) => {
  const values = [shopId, bookingId];
  let where = 'shop_id = ? AND booking_id = ? AND is_deleted = 0';
  if (options.status) { where += ' AND status = ?'; values.push(options.status); }
  if (options.paymentMethod) { where += ' AND payment_method = ?'; values.push(options.paymentMethod); }
  if (options.startDate) { where += ' AND transaction_date >= ?'; values.push(options.startDate); }
  if (options.endDate) { where += ' AND transaction_date <= ?'; values.push(options.endDate); }
  const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM payments WHERE ${where}`, values);
  return Number(rows[0]?.total || 0);
};

export const findCustomerPayments = async (shopId, customerId, options, connection = pool) => {
  const values = [shopId, customerId];
  let where = 'p.shop_id = ? AND p.customer_id = ? AND p.is_deleted = 0';
  if (options.status) { where += ' AND p.status = ?'; values.push(options.status); }
  if (options.paymentMethod) { where += ' AND p.payment_method = ?'; values.push(options.paymentMethod); }
  if (options.startDate) { where += ' AND p.transaction_date >= ?'; values.push(options.startDate); }
  if (options.endDate) { where += ' AND p.transaction_date <= ?'; values.push(options.endDate); }
  const [rows] = await connection.query(
    `SELECT ${paymentSelect} FROM payments p
     LEFT JOIN bookings b ON b.id = p.booking_id AND b.shop_id = p.shop_id
     INNER JOIN customers c ON c.id = p.customer_id AND c.shop_id = p.shop_id
     WHERE ${where} ORDER BY p.transaction_date DESC, p.id DESC LIMIT ? OFFSET ?`,
    [...values, options.limit, options.offset],
  );
  return rows.map(mapPayment);
};

export const countCustomerPayments = async (shopId, customerId, options, connection = pool) => {
  const values = [shopId, customerId];
  let where = 'shop_id = ? AND customer_id = ? AND is_deleted = 0';
  if (options.status) { where += ' AND status = ?'; values.push(options.status); }
  if (options.paymentMethod) { where += ' AND payment_method = ?'; values.push(options.paymentMethod); }
  if (options.startDate) { where += ' AND transaction_date >= ?'; values.push(options.startDate); }
  if (options.endDate) { where += ' AND transaction_date <= ?'; values.push(options.endDate); }
  const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM payments WHERE ${where}`, values);
  return Number(rows[0]?.total || 0);
};

export const getOutstandingBalanceByShop = async (shopId, connection = pool) => {
  const [rows] = await connection.query(
    'SELECT COALESCE(SUM(balance_amount), 0) AS outstanding FROM bookings WHERE shop_id = ? AND is_deleted = 0',
    [shopId],
  );
  return rows[0]?.outstanding || '0.00';
};