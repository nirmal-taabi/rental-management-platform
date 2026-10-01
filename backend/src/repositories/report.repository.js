import { pool } from '../config/database.js';

const queryRows = async (sql, values = []) => (await pool.query(sql, values))[0];
const queryOne = async (sql, values = []) => (await queryRows(sql, values))[0] || {};

export const getBookingTrend = (shopId, { startDate, endDate, groupBy }) => queryRows(
  `SELECT date_trunc(?, booking_date)::DATE::TEXT AS period,
     COUNT(*)::INT AS bookings
   FROM bookings
   WHERE shop_id = ? AND is_deleted = 0 AND status NOT IN ('DRAFT', 'CANCELLED')
     AND booking_date::DATE BETWEEN ? AND ?
   GROUP BY 1
   ORDER BY 1`,
  [groupBy, shopId, startDate, endDate],
);

export const getBookingStatusReport = (shopId, { startDate, endDate }) => queryRows(
  `SELECT status, COUNT(*)::INT AS count
   FROM bookings
   WHERE shop_id = ? AND is_deleted = 0 AND status <> 'DRAFT'
     AND booking_date::DATE BETWEEN ? AND ?
   GROUP BY status
   ORDER BY status`,
  [shopId, startDate, endDate],
);

export const getBookingsForExport = (shopId, { startDate, endDate }, includeFinancials) => queryRows(
  `SELECT b.booking_number, b.booking_date::DATE::TEXT AS booking_date,
     b.rental_start_date::TEXT AS rental_start_date, b.rental_end_date::TEXT AS rental_end_date,
     b.status, c.first_name || ' ' || COALESCE(c.last_name, '') AS customer,
     ${includeFinancials ? 'b.total_amount, b.paid_amount, b.balance_amount' : 'NULL AS total_amount, NULL AS paid_amount, NULL AS balance_amount'}
   FROM bookings b
   INNER JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
   WHERE b.shop_id = ? AND b.is_deleted = 0 AND b.status <> 'DRAFT'
     AND b.booking_date::DATE BETWEEN ? AND ?
   ORDER BY b.booking_date DESC, b.id DESC
   LIMIT 500`,
  [shopId, startDate, endDate],
);

export const getPaymentReport = async (shopId, { startDate, endDate, groupBy }) => {
  const payments = await queryOne(
    `SELECT COALESCE(SUM(GREATEST(amount - refunded_amount, 0)), 0)::NUMERIC AS total_collected,
       COALESCE(SUM(GREATEST(amount - refunded_amount, 0)) FILTER (WHERE payment_type = 'RENTAL'), 0)::NUMERIC AS rental_collected,
       COALESCE(SUM(GREATEST(amount - refunded_amount, 0)) FILTER (WHERE payment_type = 'DEPOSIT'), 0)::NUMERIC AS deposit_collected
     FROM payments
     WHERE shop_id = ? AND is_deleted = 0 AND transaction_date BETWEEN ? AND ?
       AND status IN ('SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED')`,
    [shopId, startDate, endDate],
  );
  const byMethod = await queryRows(
    `SELECT payment_method, SUM(GREATEST(amount - refunded_amount, 0))::NUMERIC AS total
     FROM payments
     WHERE shop_id = ? AND is_deleted = 0 AND transaction_date BETWEEN ? AND ?
       AND status IN ('SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED')
     GROUP BY payment_method ORDER BY payment_method`,
    [shopId, startDate, endDate],
  );
  const byType = await queryRows(
    `SELECT payment_type, SUM(GREATEST(amount - refunded_amount, 0))::NUMERIC AS total
     FROM payments
     WHERE shop_id = ? AND is_deleted = 0 AND transaction_date BETWEEN ? AND ?
       AND status IN ('SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED')
     GROUP BY payment_type ORDER BY payment_type`,
    [shopId, startDate, endDate],
  );
  const trend = await queryRows(
    `SELECT date_trunc(?, transaction_date::TIMESTAMP)::DATE::TEXT AS period,
       SUM(GREATEST(amount - refunded_amount, 0))::NUMERIC AS total
     FROM payments
     WHERE shop_id = ? AND is_deleted = 0 AND transaction_date BETWEEN ? AND ?
       AND status IN ('SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED')
     GROUP BY 1
     ORDER BY 1`,
    [groupBy, shopId, startDate, endDate],
  );

  return { ...payments, byMethod, byType, trend };
};

export const getInventoryReport = async (shopId) => {
  const rows = await queryRows(
    `SELECT status, COUNT(*)::INT AS count
     FROM inventory_items
     WHERE shop_id = ? AND is_deleted = 0
     GROUP BY status ORDER BY status`,
    [shopId],
  );
  const statuses = Object.fromEntries(rows.map(({ status, count }) => [status, count]));
  const total = rows.reduce((sum, row) => sum + Number(row.count), 0);
  const usable = total - Number(statuses.LOST || 0) - Number(statuses.RETIRED || 0);
  const rentedReserved = Number(statuses.RENTED || 0) + Number(statuses.RESERVED || 0);
  return {
    total,
    statuses,
    usable,
    utilization: usable ? Number(((rentedReserved / usable) * 100).toFixed(2)) : 0,
  };
};

export const getTopProducts = (shopId, { startDate, endDate }, limit) => queryRows(
  `SELECT p.id, p.name, p.sku,
     COUNT(DISTINCT b.id)::INT AS booking_count,
     COALESCE(SUM(bi.quantity), 0)::INT AS quantity_rented,
     COALESCE(SUM(bi.rental_price), 0)::NUMERIC AS rental_value
   FROM booking_items bi
   INNER JOIN bookings b ON b.id = bi.booking_id AND b.shop_id = bi.shop_id
   INNER JOIN products p ON p.id = bi.product_id AND p.shop_id = bi.shop_id
   WHERE b.shop_id = ? AND b.is_deleted = 0 AND bi.is_deleted = 0
     AND b.status NOT IN ('DRAFT', 'CANCELLED')
     AND b.booking_date::DATE BETWEEN ? AND ?
   GROUP BY p.id
   ORDER BY quantity_rented DESC, booking_count DESC, p.name ASC
   LIMIT ?`,
  [shopId, startDate, endDate, limit],
);

export const getCategoryReport = (shopId, { startDate, endDate }) => queryRows(
  `SELECT c.id, c.name,
     COUNT(DISTINCT b.id)::INT AS booking_count,
     COALESCE(SUM(bi.quantity), 0)::INT AS quantity_rented,
     COALESCE(SUM(bi.rental_price), 0)::NUMERIC AS rental_value
   FROM categories c
   LEFT JOIN products p ON p.category_id = c.id AND p.shop_id = c.shop_id AND p.is_deleted = 0
   LEFT JOIN booking_items bi ON bi.product_id = p.id AND bi.shop_id = p.shop_id AND bi.is_deleted = 0
   LEFT JOIN bookings b ON b.id = bi.booking_id AND b.shop_id = bi.shop_id
     AND b.is_deleted = 0 AND b.status NOT IN ('DRAFT', 'CANCELLED')
     AND b.booking_date::DATE BETWEEN ? AND ?
   WHERE c.shop_id = ? AND c.is_deleted = 0
   GROUP BY c.id
   ORDER BY quantity_rented DESC, c.name ASC`,
  [startDate, endDate, shopId],
);

export const getCustomerReport = async (shopId, { startDate, endDate }, includeFinancials) => {
  const summary = await queryOne(
    `WITH period_customers AS (
       SELECT DISTINCT customer_id
       FROM bookings
       WHERE shop_id = ? AND is_deleted = 0 AND status NOT IN ('DRAFT', 'CANCELLED')
         AND booking_date::DATE BETWEEN ? AND ?
     )
     SELECT
       (SELECT COUNT(*)::INT FROM customers WHERE shop_id = ? AND is_deleted = 0 AND created_at::DATE BETWEEN ? AND ?) AS new_customers,
       COUNT(*)::INT AS customers_with_bookings,
       COUNT(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM bookings earlier
         WHERE earlier.shop_id = ? AND earlier.customer_id = period_customers.customer_id
           AND earlier.is_deleted = 0 AND earlier.status NOT IN ('DRAFT', 'CANCELLED')
           AND earlier.booking_date::DATE < ?
       ))::INT AS returning_customers
     FROM period_customers`,
    [shopId, startDate, endDate, shopId, startDate, endDate, shopId, startDate],
  );
  const paid = includeFinancials
    ? `, COALESCE(SUM(payment_totals.paid), 0)::NUMERIC AS paid`
    : '';
  const paymentJoin = includeFinancials
    ? `LEFT JOIN (
         SELECT customer_id, shop_id, SUM(GREATEST(amount - refunded_amount, 0)) AS paid
         FROM payments
         WHERE shop_id = ? AND is_deleted = 0 AND transaction_date BETWEEN ? AND ?
           AND status IN ('SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED')
         GROUP BY customer_id, shop_id
       ) payment_totals ON payment_totals.customer_id = c.id AND payment_totals.shop_id = c.shop_id`
    : '';
  const values = includeFinancials
    ? [startDate, endDate, shopId, startDate, endDate, shopId]
    : [startDate, endDate, shopId];
  const topCustomers = await queryRows(
    `SELECT c.id, c.first_name, c.last_name, COUNT(DISTINCT b.id)::INT AS booking_count${paid}
     FROM customers c
     INNER JOIN bookings b ON b.customer_id = c.id AND b.shop_id = c.shop_id
       AND b.is_deleted = 0 AND b.status NOT IN ('DRAFT', 'CANCELLED')
       AND b.booking_date::DATE BETWEEN ? AND ?
     ${paymentJoin}
     WHERE c.shop_id = ? AND c.is_deleted = 0
     GROUP BY c.id${includeFinancials ? ', payment_totals.paid' : ''}
     ORDER BY booking_count DESC, c.first_name ASC
     LIMIT 10`,
    values,
  );
  return { ...summary, topCustomers };
};

export const getReturnReport = async (shopId, { startDate, endDate }) => queryOne(
  `WITH scoped_returns AS (
     SELECT r.id, r.status, r.return_date::DATE AS actual_date,
       COALESCE(b.expected_return_date, b.rental_end_date) AS expected_date
     FROM returns r
     INNER JOIN bookings b ON b.id = r.booking_id AND b.shop_id = r.shop_id
     WHERE r.shop_id = ? AND r.is_deleted = 0 AND r.return_date::DATE BETWEEN ? AND ?
   )
   SELECT COUNT(*)::INT AS total,
     COUNT(*) FILTER (WHERE status <> 'late' AND actual_date <= expected_date)::INT AS on_time,
     COUNT(*) FILTER (WHERE status = 'late' OR actual_date > expected_date)::INT AS late,
     (SELECT COUNT(*)::INT FROM return_items ri INNER JOIN scoped_returns sr ON sr.id = ri.return_id
       WHERE ri.shop_id = ? AND ri.is_deleted = 0 AND ri.damage_status = 'MINOR') AS minor_damage,
     (SELECT COUNT(*)::INT FROM return_items ri INNER JOIN scoped_returns sr ON sr.id = ri.return_id
       WHERE ri.shop_id = ? AND ri.is_deleted = 0 AND ri.damage_status = 'MAJOR') AS major_damage,
     (SELECT COUNT(*)::INT FROM return_items ri INNER JOIN scoped_returns sr ON sr.id = ri.return_id
       WHERE ri.shop_id = ? AND ri.is_deleted = 0 AND ri.damage_status = 'LOST') AS lost_items,
     COALESCE(AVG(GREATEST(actual_date - expected_date, 0))
       FILTER (WHERE status = 'late' OR actual_date > expected_date), 0)::NUMERIC AS average_days_late
   FROM scoped_returns`,
  [shopId, startDate, endDate, shopId, shopId, shopId],
);

export const getLateReturns = (shopId, { startDate, endDate }) => queryRows(
  `SELECT r.id, b.booking_number, c.first_name, c.last_name,
     COALESCE(b.expected_return_date, b.rental_end_date)::TEXT AS expected_return_date,
     r.return_date::DATE::TEXT AS actual_return_date,
     GREATEST(r.return_date::DATE - COALESCE(b.expected_return_date, b.rental_end_date), 0)::INT AS days_late,
     COUNT(ri.id)::INT AS items_returned
   FROM returns r
   INNER JOIN bookings b ON b.id = r.booking_id AND b.shop_id = r.shop_id
   INNER JOIN customers c ON c.id = r.customer_id AND c.shop_id = r.shop_id
   LEFT JOIN return_items ri ON ri.return_id = r.id AND ri.shop_id = r.shop_id AND ri.is_deleted = 0
   WHERE r.shop_id = ? AND r.is_deleted = 0
     AND r.return_date::DATE BETWEEN ? AND ?
     AND (r.status = 'late' OR r.return_date::DATE > COALESCE(b.expected_return_date, b.rental_end_date))
   GROUP BY r.id, b.id, c.id
   ORDER BY r.return_date DESC
   LIMIT 100`,
  [shopId, startDate, endDate],
);

export const getInventoryDamage = (shopId, { startDate, endDate }) => queryRows(
  `SELECT p.name AS product_name, i.item_code AS inventory_sku,
     ri.damage_status, ri.return_condition, r.return_date::DATE::TEXT AS return_date, ri.notes
   FROM return_items ri
   INNER JOIN returns r ON r.id = ri.return_id AND r.shop_id = ri.shop_id
   INNER JOIN inventory_items i ON i.id = ri.inventory_item_id AND i.shop_id = ri.shop_id
   INNER JOIN products p ON p.id = i.product_id AND p.shop_id = i.shop_id
   WHERE ri.shop_id = ? AND ri.is_deleted = 0 AND r.is_deleted = 0
     AND r.return_date::DATE BETWEEN ? AND ? AND ri.damage_status IN ('MINOR', 'MAJOR', 'LOST')
   ORDER BY r.return_date DESC
   LIMIT 100`,
  [shopId, startDate, endDate],
);