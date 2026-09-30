import { pool } from '../config/database.js';

const toLowerStatus = (value) => String(value || 'active').toLowerCase();

export const mapCustomerRow = (row = {}) => ({
  id: row.id,
  shopId: row.shop_id,
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
  alternatePhone: row.alternate_phone,
  email: row.email,
  address: row.address_line1,
  addressLine2: row.address_line2,
  city: row.city,
  state: row.state,
  pincode: row.postal_code,
  gstin: row.gstin,
  notes: row.notes,
  status: String(row.status || 'active').toUpperCase(),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findCustomersByShop = async (shopId, options = {}, connection = pool) => {
  const page = Math.max(1, Number(options.page || 1));
  const limit = Math.min(100, Math.max(1, Number(options.limit || 20)));
  const offset = (page - 1) * limit;
  const search = String(options.search || '').trim();
  const status = String(options.status || '').trim().toLowerCase();
  const rentalFilter = String(options.rentalFilter || '').trim().toUpperCase();
  const sortBy = ['created_at', 'updated_at', 'first_name', 'last_name', 'status'].includes(options.sortBy)
    ? options.sortBy
    : 'created_at';
  const sortOrder = String(options.sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const values = [shopId];
  let whereClause = 'WHERE shop_id = ? AND is_deleted = 0';

  if (status) {
    whereClause += ' AND status = ?';
    values.push(status);
  }

  if (rentalFilter === 'ACTIVE') {
    whereClause += ` AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.customer_id = customers.id AND b.shop_id = customers.shop_id
        AND b.is_deleted = 0 AND b.status = 'ACTIVE'
    )`;
  } else if (rentalFilter === 'UPCOMING') {
    whereClause += ` AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.customer_id = customers.id AND b.shop_id = customers.shop_id
        AND b.is_deleted = 0 AND b.status IN ('PENDING', 'CONFIRMED', 'READY')
        AND b.rental_start_date > CURRENT_DATE()
    )`;
  }

  if (search) {
    whereClause += ` AND (
      LOWER(first_name) LIKE ? OR
      LOWER(last_name) LIKE ? OR
      LOWER(CONCAT(first_name, ' ', last_name)) LIKE ? OR
      LOWER(phone) LIKE ? OR
      LOWER(alternate_phone) LIKE ? OR
      LOWER(email) LIKE ?
    )`;
    const term = `%${search.toLowerCase()}%`;
    values.push(term, term, term, term, term, term);
  }

  const [rows] = await connection.query(
    `SELECT * FROM customers ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );

  return rows.map(mapCustomerRow);
};

export const countCustomersByShop = async (shopId, options = {}, connection = pool) => {
  const search = String(options.search || '').trim();
  const status = String(options.status || '').trim().toLowerCase();
  const rentalFilter = String(options.rentalFilter || '').trim().toUpperCase();
  const values = [shopId];
  let whereClause = 'WHERE shop_id = ? AND is_deleted = 0';

  if (status) {
    whereClause += ' AND status = ?';
    values.push(status);
  }

  if (rentalFilter === 'ACTIVE') {
    whereClause += ` AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.customer_id = customers.id AND b.shop_id = customers.shop_id
        AND b.is_deleted = 0 AND b.status = 'ACTIVE'
    )`;
  } else if (rentalFilter === 'UPCOMING') {
    whereClause += ` AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.customer_id = customers.id AND b.shop_id = customers.shop_id
        AND b.is_deleted = 0 AND b.status IN ('PENDING', 'CONFIRMED', 'READY')
        AND b.rental_start_date > CURRENT_DATE()
    )`;
  }

  if (search) {
    whereClause += ` AND (
      LOWER(first_name) LIKE ? OR
      LOWER(last_name) LIKE ? OR
      LOWER(CONCAT(first_name, ' ', last_name)) LIKE ? OR
      LOWER(phone) LIKE ? OR
      LOWER(alternate_phone) LIKE ? OR
      LOWER(email) LIKE ?
    )`;
    const term = `%${search.toLowerCase()}%`;
    values.push(term, term, term, term, term, term);
  }

  const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM customers ${whereClause}`, values);
  return Number(rows[0]?.total || 0);
};

export const getCustomerSummaryByShop = async (shopId, options = {}, connection = pool) => {
  const search = String(options.search || '').trim();
  const values = [shopId];
  let whereClause = 'WHERE customers.shop_id = ? AND customers.is_deleted = 0';

  if (search) {
    whereClause += ` AND (
      LOWER(customers.first_name) LIKE ? OR
      LOWER(customers.last_name) LIKE ? OR
      LOWER(CONCAT(customers.first_name, ' ', customers.last_name)) LIKE ? OR
      LOWER(customers.phone) LIKE ? OR
      LOWER(customers.alternate_phone) LIKE ? OR
      LOWER(customers.email) LIKE ?
    )`;
    const term = `%${search.toLowerCase()}%`;
    values.push(term, term, term, term, term, term);
  }

  const [rows] = await connection.query(
    `SELECT
      COUNT(DISTINCT customers.id) AS total_customers,
      COUNT(DISTINCT CASE WHEN customers.status = 'active' THEN customers.id END) AS active_customers,
      COUNT(DISTINCT CASE WHEN customers.status = 'inactive' THEN customers.id END) AS inactive_customers,
      COUNT(DISTINCT CASE WHEN bookings.status = 'ACTIVE' THEN bookings.id END) AS active_rentals,
      COUNT(DISTINCT CASE
        WHEN bookings.status IN ('PENDING', 'CONFIRMED', 'READY')
          AND bookings.rental_start_date > CURRENT_DATE()
        THEN bookings.id
      END) AS upcoming_rentals
     FROM customers
     LEFT JOIN bookings ON bookings.customer_id = customers.id
       AND bookings.shop_id = customers.shop_id AND bookings.is_deleted = 0
     ${whereClause}`,
    values,
  );

  return {
    totalCustomers: Number(rows[0]?.total_customers || 0),
    activeCustomers: Number(rows[0]?.active_customers || 0),
    inactiveCustomers: Number(rows[0]?.inactive_customers || 0),
    activeRentals: Number(rows[0]?.active_rentals || 0),
    upcomingRentals: Number(rows[0]?.upcoming_rentals || 0),
  };
};

export const findCustomerById = async (shopId, customerId, connection = pool) => {
  const [rows] = await connection.query(
    'SELECT * FROM customers WHERE id = ? AND shop_id = ? AND is_deleted = 0 LIMIT 1',
    [customerId, shopId],
  );

  return rows[0] ? mapCustomerRow(rows[0]) : null;
};

export const findCustomerByPhone = async (shopId, phone, connection = pool) => {
  const [rows] = await connection.query(
    'SELECT * FROM customers WHERE shop_id = ? AND phone = ? AND is_deleted = 0 LIMIT 1',
    [shopId, phone],
  );

  return rows[0] ? mapCustomerRow(rows[0]) : null;
};

export const findCustomerByEmail = async (shopId, email, connection = pool) => {
  const [rows] = await connection.query(
    'SELECT * FROM customers WHERE shop_id = ? AND email = ? AND is_deleted = 0 LIMIT 1',
    [shopId, email],
  );

  return rows[0] ? mapCustomerRow(rows[0]) : null;
};

export const createCustomer = async (shopId, payload, connection = pool) => {
  const [result] = await connection.query(
    `INSERT INTO customers (
      shop_id,
      first_name,
      last_name,
      phone,
      alternate_phone,
      email,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      notes,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      shopId,
      payload.firstName,
      payload.lastName || null,
      payload.phone,
      payload.alternatePhone || null,
      payload.email || null,
      payload.address || null,
      payload.addressLine2 || null,
      payload.city || null,
      payload.state || null,
      payload.pincode || null,
      payload.notes || null,
      toLowerStatus(payload.status || 'active'),
    ],
  );

  return findCustomerById(shopId, result.insertId, connection);
};

export const updateCustomer = async (shopId, customerId, payload, connection = pool) => {
  const fields = [];
  const values = [];

  const allowedFields = {
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    alternatePhone: 'alternate_phone',
    email: 'email',
    address: 'address_line1',
    addressLine2: 'address_line2',
    city: 'city',
    state: 'state',
    pincode: 'postal_code',
    notes: 'notes',
  };

  Object.entries(allowedFields).forEach(([key, column]) => {
    if (payload[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(payload[key] === '' ? null : payload[key]);
    }
  });

  if (fields.length === 0) {
    return findCustomerById(shopId, customerId, connection);
  }

  values.push(customerId, shopId);
  await connection.query(`UPDATE customers SET ${fields.join(', ')} WHERE id = ? AND shop_id = ?`, values);
  return findCustomerById(shopId, customerId, connection);
};

export const updateCustomerStatus = async (shopId, customerId, status, connection = pool) => {
  const normalizedStatus = toLowerStatus(status);
  await connection.query('UPDATE customers SET status = ? WHERE id = ? AND shop_id = ? AND is_deleted = 0', [normalizedStatus, customerId, shopId]);
  return findCustomerById(shopId, customerId, connection);
};
