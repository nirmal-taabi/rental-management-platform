import { pool } from '../config/database.js';

const queryRows = async (sql, values = []) => (await pool.query(sql, values))[0];
const queryOne = async (sql, values = []) => (await queryRows(sql, values))[0] || {};

export const getDashboardSummary = async (shopId, {
  startDate, endDate, previousStartDate, previousEndDate, includeFinancials,
}) => {
  const [booking, inventoryRows, customers, financials, previous, currentOutstanding] = await Promise.all([
    queryOne(
      `SELECT COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED')::INT AS confirmed,
        COUNT(*) FILTER (WHERE status = 'READY')::INT AS ready,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::INT AS active,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::INT AS completed,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')::INT AS cancelled
       FROM bookings
       WHERE shop_id = ? AND is_deleted = 0 AND booking_date::DATE BETWEEN ? AND ?`,
      [shopId, startDate, endDate],
    ),
    queryRows(
      `SELECT status, COUNT(*)::INT AS count
       FROM inventory_items
       WHERE shop_id = ? AND is_deleted = 0
       GROUP BY status`,
      [shopId],
    ),
    queryOne(
      `SELECT COUNT(*) FILTER (WHERE created_at::DATE BETWEEN ? AND ?)::INT AS new,
        COUNT(*) FILTER (WHERE status = 'active')::INT AS active
       FROM customers
       WHERE shop_id = ? AND is_deleted = 0`,
      [startDate, endDate, shopId],
    ),
    includeFinancials
      ? queryOne(
        `SELECT COALESCE(SUM(GREATEST(amount - refunded_amount, 0)), 0)::NUMERIC AS collected
         FROM payments
         WHERE shop_id = ? AND is_deleted = 0 AND transaction_date BETWEEN ? AND ?
           AND status IN ('SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED')`,
        [shopId, startDate, endDate],
      )
      : Promise.resolve(null),
    queryOne(
      `SELECT
         (SELECT COUNT(*)::INT FROM bookings
          WHERE shop_id = ? AND is_deleted = 0 AND status NOT IN ('DRAFT', 'CANCELLED')
            AND booking_date::DATE BETWEEN ? AND ?) AS bookings,
         (SELECT COUNT(*)::INT FROM customers
          WHERE shop_id = ? AND is_deleted = 0 AND created_at::DATE BETWEEN ? AND ?) AS new_customers
         ${includeFinancials ? `,
         (SELECT COALESCE(SUM(GREATEST(amount - refunded_amount, 0)), 0)::NUMERIC FROM payments
          WHERE shop_id = ? AND is_deleted = 0 AND transaction_date BETWEEN ? AND ?
            AND status IN ('SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED')) AS collected,
         (SELECT COALESCE(SUM(balance_amount), 0)::NUMERIC FROM bookings
          WHERE shop_id = ? AND is_deleted = 0 AND status NOT IN ('DRAFT', 'CANCELLED')
            AND balance_amount > 0 AND booking_date::DATE BETWEEN ? AND ?) AS outstanding` : ''}`,
      includeFinancials
        ? [shopId, previousStartDate, previousEndDate, shopId, previousStartDate, previousEndDate,
          shopId, previousStartDate, previousEndDate, shopId, previousStartDate, previousEndDate]
        : [shopId, previousStartDate, previousEndDate, shopId, previousStartDate, previousEndDate],
    ),
    includeFinancials
      ? queryOne(
        `SELECT COALESCE(SUM(balance_amount), 0)::NUMERIC AS outstanding
         FROM bookings
         WHERE shop_id = ? AND is_deleted = 0 AND status NOT IN ('DRAFT', 'CANCELLED')
           AND balance_amount > 0 AND booking_date::DATE BETWEEN ? AND ?`,
        [shopId, startDate, endDate],
      )
      : Promise.resolve(null),
  ]);

  const inventory = Object.fromEntries(inventoryRows.map((row) => [row.status, row.count]));
  const usable = Object.entries(inventory).reduce(
    (total, [status, count]) => total + (['LOST', 'RETIRED'].includes(status) ? 0 : Number(count)),
    0,
  );
  const rentedOrReserved = Number(inventory.RENTED || 0) + Number(inventory.RESERVED || 0);

  const summary = {
    range: { startDate, endDate },
    comparison: {
      bookings: comparePeriod(booking.total, previous.bookings),
      newCustomers: comparePeriod(customers.new, previous.new_customers),
      ...(includeFinancials ? {
        paymentsCollected: comparePeriod(financials.collected, previous.collected),
        outstanding: comparePeriod(currentOutstanding.outstanding, previous.outstanding),
      } : {}),
    },
    bookings: booking,
    inventory: {
      total: Object.values(inventory).reduce((total, count) => total + Number(count), 0),
      available: Number(inventory.AVAILABLE || 0),
      reserved: Number(inventory.RESERVED || 0),
      rented: Number(inventory.RENTED || 0),
      inspection: Number(inventory.INSPECTION || 0),
      cleaning: Number(inventory.CLEANING || 0),
      alteration: Number(inventory.ALTERATION || 0),
      repair: Number(inventory.REPAIR || 0),
      damaged: Number(inventory.DAMAGED || 0),
      lost: Number(inventory.LOST || 0),
      retired: Number(inventory.RETIRED || 0),
      usable,
      utilization: usable ? Number(((rentedOrReserved / usable) * 100).toFixed(2)) : 0,
    },
    customers,
  };

  if (includeFinancials) {
    summary.payments = {
      collected: financials.collected,
      outstanding: currentOutstanding.outstanding,
    };
  }

  return summary;
};

const comparePeriod = (current, previous) => {
  const currentValue = current === null ? null : Number(current || 0);
  const previousValue = Number(previous || 0);
  return {
    current: currentValue,
    previous: previousValue,
    percentageChange: currentValue === null || previousValue === 0
      ? null
      : Number((((currentValue - previousValue) / previousValue) * 100).toFixed(2)),
  };
};

export const getDashboardOperations = async (shopId, today) => {
  const [counts, pickups, returns] = await Promise.all([
    queryOne(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('READY', 'CONFIRMED') AND rental_start_date = ?)::INT AS pickups_today,
         COUNT(*) FILTER (WHERE status = 'ACTIVE' AND COALESCE(expected_return_date, rental_end_date) = ?)::INT AS returns_today,
         COUNT(*) FILTER (WHERE status = 'ACTIVE')::INT AS active_rentals,
         COUNT(*) FILTER (WHERE status = 'ACTIVE' AND COALESCE(expected_return_date, rental_end_date) < ?)::INT AS overdue_returns
       FROM bookings
       WHERE shop_id = ? AND is_deleted = 0`,
      [today, today, today, shopId],
    ),
    queryRows(
      `SELECT b.id, b.booking_number, b.rental_start_date, b.status,
         c.first_name, c.last_name, COUNT(bi.id)::INT AS item_count
       FROM bookings b
       INNER JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
       LEFT JOIN booking_items bi ON bi.booking_id = b.id AND bi.shop_id = b.shop_id AND bi.is_deleted = 0
       WHERE b.shop_id = ? AND b.is_deleted = 0 AND b.status IN ('READY', 'CONFIRMED')
         AND b.rental_start_date BETWEEN ? AND (?::DATE + INTERVAL '7 days')::DATE
       GROUP BY b.id, c.id
       ORDER BY b.rental_start_date ASC, b.id ASC
       LIMIT 5`,
      [shopId, today, today],
    ),
    queryRows(
      `SELECT b.id, b.booking_number, COALESCE(b.expected_return_date, b.rental_end_date) AS expected_return_date,
         b.status, c.first_name, c.last_name, COUNT(bi.id)::INT AS item_count
       FROM bookings b
       INNER JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
       LEFT JOIN booking_items bi ON bi.booking_id = b.id AND bi.shop_id = b.shop_id AND bi.is_deleted = 0
       WHERE b.shop_id = ? AND b.is_deleted = 0 AND b.status = 'ACTIVE'
         AND COALESCE(b.expected_return_date, b.rental_end_date) BETWEEN ? AND (?::DATE + INTERVAL '7 days')::DATE
       GROUP BY b.id, c.id
       ORDER BY expected_return_date ASC, b.id ASC
       LIMIT 5`,
      [shopId, today, today],
    ),
  ]);

  return { date: today, counts, upcomingPickups: pickups, upcomingReturns: returns };
};

export const getDashboardAttention = async (shopId, today, includeFinancials) => {
  const [overdue, inventory, balances] = await Promise.all([
    queryRows(
      `SELECT b.id, b.booking_number, COALESCE(b.expected_return_date, b.rental_end_date) AS expected_return_date,
         c.first_name, c.last_name,
         ( ?::DATE - COALESCE(b.expected_return_date, b.rental_end_date))::INT AS days_overdue,
         COUNT(bi.id)::INT AS items_outstanding
       FROM bookings b
       INNER JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
       LEFT JOIN booking_items bi ON bi.booking_id = b.id AND bi.shop_id = b.shop_id
         AND bi.is_deleted = 0 AND bi.status <> 'returned'
       WHERE b.shop_id = ? AND b.is_deleted = 0 AND b.status = 'ACTIVE'
         AND COALESCE(b.expected_return_date, b.rental_end_date) < ?
       GROUP BY b.id, c.id
       ORDER BY expected_return_date ASC
       LIMIT 5`,
      [today, shopId, today],
    ),
    queryOne(
      `SELECT COUNT(*) FILTER (WHERE status IN ('DAMAGED', 'LOST'))::INT AS damaged_or_lost,
         COUNT(*) FILTER (WHERE status IN ('INSPECTION', 'CLEANING', 'ALTERATION', 'REPAIR'))::INT AS maintenance
       FROM inventory_items WHERE shop_id = ? AND is_deleted = 0`,
      [shopId],
    ),
    includeFinancials
      ? queryOne(
        `SELECT COUNT(*)::INT AS bookings_with_balance
         FROM bookings
         WHERE shop_id = ? AND is_deleted = 0 AND status NOT IN ('DRAFT', 'CANCELLED') AND balance_amount > 0`,
        [shopId],
      )
      : Promise.resolve(null),
  ]);

  return {
    overdueReturns: overdue,
    damagedOrLostInventory: inventory.damaged_or_lost,
    inventoryInMaintenance: inventory.maintenance,
    ...(includeFinancials ? { bookingsWithBalance: balances.bookings_with_balance } : {}),
  };
};

export const getDashboardActivity = async (shopId) => queryRows(
  `SELECT action, entity_type, entity_id, created_at
   FROM audit_logs
   WHERE shop_id = ?
   ORDER BY created_at DESC, id DESC
   LIMIT 10`,
  [shopId],
);