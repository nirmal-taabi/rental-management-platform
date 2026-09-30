import { pool } from '../config/database.js';

const returnSortColumns = { returnDate: 'r.return_date', createdAt: 'r.created_at' };

const mapItem = (row) => ({
  id: row.return_item_id ?? row.booking_item_id,
  bookingItemId: row.booking_item_id,
  inventoryItemId: row.inventory_item_id,
  productId: row.product_id,
  productName: row.product_name,
  productSku: row.product_sku,
  inventorySku: row.inventory_sku,
  size: row.size,
  color: row.color,
  inventoryStatus: row.inventory_status ? String(row.inventory_status).toUpperCase() : undefined,
  condition: row.return_condition ? String(row.return_condition).toUpperCase() : String(row.physical_condition || '').toUpperCase(),
  damageStatus: row.damage_status ? String(row.damage_status).toUpperCase() : undefined,
  actualReturnedAt: row.actual_returned_at,
  notes: row.item_notes ?? row.notes,
});

const mapReturn = (row, items = []) => ({
  id: row.id,
  shopId: row.shop_id,
  bookingId: row.booking_id,
  bookingNumber: row.booking_number,
  customer: {
    id: row.customer_id,
    name: [row.first_name, row.last_name].filter(Boolean).join(' '),
    phone: row.phone,
  },
  returnedAt: row.return_date,
  expectedReturnDate: row.expected_return_date,
  receivedBy: row.received_by_user_id,
  status: String(row.status || '').toUpperCase(),
  damageAmount: row.damage_amount,
  lateFeeAmount: row.total_late_fee,
  notes: row.notes,
  createdAt: row.created_at,
  items,
});

export const findBookingForLifecycle = async (shopId, bookingId, connection = pool, lock = true) => {
  const [rows] = await connection.query(
    `SELECT b.id, b.shop_id, b.customer_id, b.booking_number, b.status,
      DATE_FORMAT(b.rental_start_date, '%Y-%m-%d') AS rental_start_date,
      DATE_FORMAT(b.rental_end_date, '%Y-%m-%d') AS rental_end_date,
      b.picked_up_at, b.picked_up_by_user_id,
      b.pickup_notes, b.returned_at, b.total_amount, b.deposit_amount, b.paid_amount, b.balance_amount,
      c.first_name, c.last_name, c.phone
     FROM bookings b
     INNER JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
    WHERE b.id = ? AND b.shop_id = ? AND b.is_deleted = 0 AND c.is_deleted = 0 LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    [bookingId, shopId],
  );
  return rows[0] || null;
};

export const findBookingItemsForUpdate = async (shopId, bookingId, connection = pool, lock = true) => {
  const [rows] = await connection.query(
    `SELECT bi.id AS booking_item_id, bi.booking_id, bi.shop_id, bi.product_id,
      bi.inventory_item_id, bi.status AS booking_item_status, bi.is_deleted,
      p.name AS product_name, p.sku AS product_sku, i.item_code AS inventory_sku,
      i.size, i.color, i.status AS inventory_status, i.physical_condition
     FROM booking_items bi
     INNER JOIN products p ON p.id = bi.product_id AND p.shop_id = bi.shop_id
     LEFT JOIN inventory_items i ON i.id = bi.inventory_item_id AND i.shop_id = bi.shop_id
     WHERE bi.booking_id = ? AND bi.shop_id = ? AND bi.is_deleted = 0
    ORDER BY bi.id${lock ? ' FOR UPDATE' : ''}`,
    [bookingId, shopId],
  );
  return rows;
};

export const findInventoryItemsForUpdate = async (shopId, inventoryItemIds, connection = pool) => {
  if (!inventoryItemIds.length) return [];
  const placeholders = inventoryItemIds.map(() => '?').join(', ');
  const [rows] = await connection.query(
    `SELECT id, shop_id, product_id, item_code, status, physical_condition
     FROM inventory_items WHERE shop_id = ? AND is_deleted = 0 AND id IN (${placeholders})
     ORDER BY id FOR UPDATE`,
    [shopId, ...inventoryItemIds],
  );
  return rows;
};

export const findInventoryItemForReturnHistory = async (shopId, inventoryItemId, connection = pool) => {
  const [rows] = await connection.query(
    'SELECT id FROM inventory_items WHERE id = ? AND shop_id = ? AND is_deleted = 0 LIMIT 1',
    [inventoryItemId, shopId],
  );
  return rows[0] || null;
};

export const findReturnedBookingItemIds = async (shopId, bookingId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT DISTINCT ri.booking_item_id FROM return_items ri
     INNER JOIN returns r ON r.id = ri.return_id AND r.shop_id = ri.shop_id
     WHERE ri.shop_id = ? AND r.booking_id = ? AND ri.is_deleted = 0 AND r.is_deleted = 0`,
    [shopId, bookingId],
  );
  return rows.map((row) => Number(row.booking_item_id));
};

export const updateLifecycleInventoryStatus = async (shopId, inventoryItemId, status, connection = pool) => {
  await connection.query(
    'UPDATE inventory_items SET status = ? WHERE id = ? AND shop_id = ? AND is_deleted = 0',
    [status, inventoryItemId, shopId],
  );
};

export const updateBookingPickup = async (shopId, bookingId, userId, pickupNotes, connection = pool) => {
  await connection.query(
    `UPDATE bookings SET status = 'ACTIVE', picked_up_at = CURRENT_TIMESTAMP,
      picked_up_by_user_id = ?, pickup_notes = ? WHERE id = ? AND shop_id = ? AND is_deleted = 0`,
    [userId || null, pickupNotes || null, bookingId, shopId],
  );
};

export const markBookingItemsPickedUp = async (shopId, bookingId, connection = pool) => {
  await connection.query(
    `UPDATE booking_items SET status = 'active', picked_up_at = CURRENT_TIMESTAMP
     WHERE booking_id = ? AND shop_id = ? AND is_deleted = 0`,
    [bookingId, shopId],
  );
};

export const createReturnRecord = async (shopId, booking, userId, returnedAt, status, notes, connection = pool) => {
  const [result] = await connection.query(
    `INSERT INTO returns
      (shop_id, booking_id, customer_id, received_by_user_id, return_date, status,
       total_late_fee, damage_amount, notes)
     VALUES (?, ?, ?, ?, ?, ?, 0.00, 0.00, ?)`,
    [shopId, booking.id, booking.customer_id, userId || null, returnedAt, status, notes || null],
  );
  return result.insertId;
};

export const createReturnItemRecord = async (shopId, returnId, item, returnedAt, connection = pool) => {
  const legacyCondition = {
    NONE: 'good',
    MINOR: 'minor_damage',
    MAJOR: 'major_damage',
    LOST: 'lost',
  }[item.damageStatus];
  await connection.query(
    `INSERT INTO return_items
      (shop_id, return_id, booking_item_id, inventory_item_id, condition_status,
       return_condition, damage_status, damage_fee, late_fee, actual_returned_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, 0.00, ?, ?)`,
    [shopId, returnId, item.bookingItemId, item.inventoryItemId, legacyCondition,
      item.condition, item.damageStatus, returnedAt, item.notes || null],
  );
};

export const markBookingItemReturned = async (shopId, bookingItemId, connection = pool) => {
  await connection.query(
    `UPDATE booking_items SET status = 'returned'
     WHERE id = ? AND shop_id = ? AND is_deleted = 0`,
    [bookingItemId, shopId],
  );
};

export const completeBookingReturn = async (shopId, bookingId, returnedAt, connection = pool) => {
  await connection.query(
    `UPDATE bookings SET status = 'COMPLETED', returned_at = ?
     WHERE id = ? AND shop_id = ? AND is_deleted = 0`,
    [returnedAt, bookingId, shopId],
  );
};

const returnColumns = `r.id, r.shop_id, r.booking_id, r.customer_id, r.return_date,
  r.received_by_user_id, r.status, r.damage_amount, r.total_late_fee, r.notes, r.created_at,
  b.booking_number, DATE_FORMAT(b.rental_end_date, '%Y-%m-%d') AS expected_return_date,
  c.first_name, c.last_name, c.phone`;

export const findReturnById = async (shopId, returnId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT ${returnColumns} FROM returns r
    INNER JOIN bookings b ON b.id = r.booking_id AND b.shop_id = r.shop_id
     INNER JOIN customers c ON c.id = r.customer_id AND c.shop_id = r.shop_id
     WHERE r.id = ? AND r.shop_id = ? AND r.is_deleted = 0 LIMIT 1`,
    [returnId, shopId],
  );
  if (!rows[0]) return null;
  const [items] = await connection.query(
    `SELECT ri.id AS return_item_id, ri.booking_item_id, ri.inventory_item_id,
      ri.return_condition, ri.damage_status, ri.actual_returned_at, ri.notes AS item_notes,
      bi.product_id, p.name AS product_name, p.sku AS product_sku,
      i.item_code AS inventory_sku, i.size, i.color, i.status AS inventory_status
     FROM return_items ri
     INNER JOIN booking_items bi ON bi.id = ri.booking_item_id AND bi.shop_id = ri.shop_id
     INNER JOIN products p ON p.id = bi.product_id AND p.shop_id = bi.shop_id
     INNER JOIN inventory_items i ON i.id = ri.inventory_item_id AND i.shop_id = ri.shop_id
     WHERE ri.return_id = ? AND ri.shop_id = ? AND ri.is_deleted = 0 ORDER BY ri.id`,
    [returnId, shopId],
  );
  return mapReturn(rows[0], items.map(mapItem));
};

export const findPickupByBooking = async (shopId, bookingId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT b.id, b.shop_id, b.customer_id, b.booking_number, b.status, b.picked_up_at,
      b.picked_up_by_user_id, b.pickup_notes, b.rental_start_date, b.rental_end_date,
      c.first_name, c.last_name, c.phone
     FROM bookings b INNER JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
     WHERE b.id = ? AND b.shop_id = ? AND b.is_deleted = 0 AND c.is_deleted = 0 LIMIT 1`,
    [bookingId, shopId],
  );
  if (!rows[0]) return null;
  const [items] = await connection.query(
    `SELECT bi.id AS booking_item_id, bi.product_id, bi.inventory_item_id,
      p.name AS product_name, p.sku AS product_sku, i.item_code AS inventory_sku,
      i.size, i.color, i.status AS inventory_status, i.physical_condition,
      bi.picked_up_at
     FROM booking_items bi
     INNER JOIN products p ON p.id = bi.product_id AND p.shop_id = bi.shop_id
     INNER JOIN inventory_items i ON i.id = bi.inventory_item_id AND i.shop_id = bi.shop_id
     WHERE bi.booking_id = ? AND bi.shop_id = ? AND bi.is_deleted = 0 ORDER BY bi.id`,
    [bookingId, shopId],
  );
  const row = rows[0];
  return {
    id: row.id,
    bookingId: row.id,
    bookingNumber: row.booking_number,
    status: String(row.status).toUpperCase(),
    pickedUpAt: row.picked_up_at,
    pickedUpBy: row.picked_up_by_user_id,
    pickupNotes: row.pickup_notes,
    rentalStartDate: row.rental_start_date,
    rentalEndDate: row.rental_end_date,
    customer: { id: row.customer_id, name: [row.first_name, row.last_name].filter(Boolean).join(' '), phone: row.phone },
    items: items.map(mapItem),
  };
};

const returnWhere = (shopId, options) => {
  const values = [shopId];
  let where = 'r.shop_id = ? AND r.is_deleted = 0';
  if (options.status === 'ON_TIME' || options.status === 'LATE') {
    where += options.status === 'LATE' ? ' AND DATE(r.return_date) > b.rental_end_date' : ' AND DATE(r.return_date) <= b.rental_end_date';
  } else if (options.status) {
    where += ' AND r.status = ?';
    values.push(options.status.toLowerCase());
  }
  if (options.bookingId) { where += ' AND r.booking_id = ?'; values.push(options.bookingId); }
  if (options.customerId) { where += ' AND r.customer_id = ?'; values.push(options.customerId); }
  if (options.startDate) { where += ' AND DATE(r.return_date) >= ?'; values.push(options.startDate); }
  if (options.endDate) { where += ' AND DATE(r.return_date) <= ?'; values.push(options.endDate); }
  if (options.damageStatus) {
    where += ` AND EXISTS (SELECT 1 FROM return_items filter_item WHERE filter_item.return_id = r.id
      AND filter_item.shop_id = r.shop_id AND filter_item.is_deleted = 0 AND filter_item.damage_status = ?)`;
    values.push(options.damageStatus);
  }
  if (options.search) {
    const term = `%${options.search.toLowerCase()}%`;
    where += ` AND (LOWER(b.booking_number) LIKE ? OR LOWER(c.first_name) LIKE ?
      OR LOWER(c.last_name) LIKE ? OR LOWER(CONCAT(c.first_name, ' ', COALESCE(c.last_name, ''))) LIKE ?
      OR LOWER(c.phone) LIKE ? OR CAST(r.id AS CHAR) LIKE ?)`;
    values.push(term, term, term, term, term, term);
  }
  return { where, values };
};

export const countReturnsByShop = async (shopId, options, connection = pool) => {
  const { where, values } = returnWhere(shopId, options);
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total FROM returns r
    INNER JOIN bookings b ON b.id = r.booking_id AND b.shop_id = r.shop_id
     INNER JOIN customers c ON c.id = r.customer_id AND c.shop_id = r.shop_id WHERE ${where}`,
    values,
  );
  return Number(rows[0]?.total || 0);
};

export const findReturnsByShop = async (shopId, options, connection = pool) => {
  const { where, values } = returnWhere(shopId, options);
  const sortBy = returnSortColumns[options.sortBy] || returnSortColumns.returnDate;
  const sortOrder = String(options.sortOrder || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const [rows] = await connection.query(
    `SELECT ${returnColumns},
      (SELECT COUNT(*) FROM return_items count_items WHERE count_items.return_id = r.id
       AND count_items.shop_id = r.shop_id AND count_items.is_deleted = 0) AS item_count,
      (SELECT COUNT(*) FROM return_items issue_items WHERE issue_items.return_id = r.id
       AND issue_items.shop_id = r.shop_id AND issue_items.is_deleted = 0
       AND issue_items.damage_status IN ('MINOR', 'MAJOR', 'LOST')) AS issue_count
     FROM returns r
    INNER JOIN bookings b ON b.id = r.booking_id AND b.shop_id = r.shop_id
     INNER JOIN customers c ON c.id = r.customer_id AND c.shop_id = r.shop_id
     WHERE ${where}
    ORDER BY ${sortBy} ${sortOrder}, r.id DESC LIMIT ? OFFSET ?`,
    [...values, options.limit, options.offset],
  );
  return rows.map((row) => ({
    ...mapReturn(row),
    itemCount: Number(row.item_count || 0),
    issueCount: Number(row.issue_count || 0),
  }));
};

export const findBookingReturns = async (shopId, bookingId, options, connection = pool) => {
  const sortBy = returnSortColumns[options.sortBy] || returnSortColumns.returnDate;
  const sortOrder = String(options.sortOrder || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const [rows] = await connection.query(
    `SELECT ${returnColumns},
      (SELECT COUNT(*) FROM return_items count_items WHERE count_items.return_id = r.id
       AND count_items.shop_id = r.shop_id AND count_items.is_deleted = 0) AS item_count
     FROM returns r
     INNER JOIN bookings b ON b.id = r.booking_id AND b.shop_id = r.shop_id
     INNER JOIN customers c ON c.id = r.customer_id AND c.shop_id = r.shop_id
     WHERE r.shop_id = ? AND r.booking_id = ? AND r.is_deleted = 0
    ORDER BY ${sortBy} ${sortOrder}, r.id DESC LIMIT ? OFFSET ?`,
    [shopId, bookingId, options.limit, options.offset],
  );
  return rows.map((row) => ({ ...mapReturn(row), itemCount: Number(row.item_count || 0) }));
};

export const countBookingReturns = async (shopId, bookingId, connection = pool) => {
  const [rows] = await connection.query(
    'SELECT COUNT(*) AS total FROM returns WHERE shop_id = ? AND booking_id = ? AND is_deleted = 0',
    [shopId, bookingId],
  );
  return Number(rows[0]?.total || 0);
};

export const findInventoryReturns = async (shopId, inventoryItemId, options, connection = pool) => {
  const sortBy = returnSortColumns[options.sortBy] || returnSortColumns.returnDate;
  const sortOrder = String(options.sortOrder || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const [rows] = await connection.query(
    `SELECT ${returnColumns}, ri.id AS return_item_id, ri.booking_item_id, ri.inventory_item_id,
      ri.return_condition, ri.damage_status, ri.actual_returned_at, ri.notes AS item_notes,
      bi.product_id, p.name AS product_name, p.sku AS product_sku, i.item_code AS inventory_sku,
      i.size, i.color, i.status AS inventory_status
     FROM return_items ri
     INNER JOIN returns r ON r.id = ri.return_id AND r.shop_id = ri.shop_id
     INNER JOIN bookings b ON b.id = r.booking_id AND b.shop_id = r.shop_id
     INNER JOIN customers c ON c.id = r.customer_id AND c.shop_id = r.shop_id
     INNER JOIN booking_items bi ON bi.id = ri.booking_item_id AND bi.shop_id = ri.shop_id
     INNER JOIN products p ON p.id = bi.product_id AND p.shop_id = bi.shop_id
     INNER JOIN inventory_items i ON i.id = ri.inventory_item_id AND i.shop_id = ri.shop_id
     WHERE ri.shop_id = ? AND ri.inventory_item_id = ? AND ri.is_deleted = 0 AND r.is_deleted = 0
    ORDER BY ${sortBy} ${sortOrder}, ri.id DESC LIMIT ? OFFSET ?`,
    [shopId, inventoryItemId, options.limit, options.offset],
  );
  return rows.map((row) => ({ ...mapReturn(row), item: mapItem(row) }));
};

export const countInventoryReturns = async (shopId, inventoryItemId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total FROM return_items ri
     INNER JOIN returns r ON r.id = ri.return_id AND r.shop_id = ri.shop_id
     WHERE ri.shop_id = ? AND ri.inventory_item_id = ? AND ri.is_deleted = 0 AND r.is_deleted = 0`,
    [shopId, inventoryItemId],
  );
  return Number(rows[0]?.total || 0);
};

export const updateLifecycleInventoryState = async (shopId, inventoryItemId, status, condition, connection = pool) => {
  await connection.query(
    `UPDATE inventory_items SET status = ?, physical_condition = ?
     WHERE id = ? AND shop_id = ? AND is_deleted = 0`,
    [status, condition, inventoryItemId, shopId],
  );
};