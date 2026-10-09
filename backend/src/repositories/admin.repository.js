import { pool } from '../config/database.js';

const queryRows = async (sql, values = []) => (await pool.query(sql, values))[0];
const queryOne = async (sql, values = []) => (await queryRows(sql, values))[0] || {};

const buildPagination = ({ page, limit }) => ({
  limit,
  offset: (page - 1) * limit,
});

const shopFilters = (options) => {
  const values = [];
  const conditions = ['s.is_deleted = 0'];
  if (options.status) {
    conditions.push('s.status = ?');
    values.push(options.status);
  }
  if (options.startDate) {
    conditions.push('s.created_at >= ?::date');
    values.push(options.startDate);
  }
  if (options.endDate) {
    conditions.push("s.created_at < (?::date + INTERVAL '1 day')");
    values.push(options.endDate);
  }
  if (options.search) {
    const term = `%${options.search.toLowerCase()}%`;
    conditions.push(`(
      LOWER(s.name) LIKE ? OR LOWER(COALESCE(s.legal_name, '')) LIKE ?
      OR LOWER(COALESCE(s.email, '')) LIKE ? OR CAST(s.id AS TEXT) LIKE ?
      OR EXISTS (
        SELECT 1 FROM user_shop_memberships owner_membership
        JOIN users owner_user ON owner_user.id = owner_membership.user_id
        WHERE owner_membership.shop_id = s.id
          AND owner_membership.role = 'OWNER'
          AND owner_membership.deleted_at IS NULL
          AND LOWER(CONCAT(owner_user.first_name, ' ', COALESCE(owner_user.last_name, ''))) LIKE ?
      )
    )`);
    values.push(term, term, term, term, term);
  }
  return { where: conditions.join(' AND '), values };
};

const userFilters = (options) => {
  const values = [];
  const conditions = ['u.is_deleted = 0'];
  if (options.status) {
    conditions.push('u.status = ?');
    values.push(options.status);
  }
  if (options.role) {
    conditions.push(options.role === 'SUPER_ADMIN' ? `EXISTS (
      SELECT 1 FROM platform_user_roles platform_role
      WHERE platform_role.user_id = u.id AND platform_role.role = ?
    )` : `EXISTS (
      SELECT 1 FROM user_shop_memberships role_membership
      WHERE role_membership.user_id = u.id
        AND role_membership.deleted_at IS NULL
        AND role_membership.status <> 'removed'
        AND UPPER(role_membership.role) = ?
    )`);
    values.push(options.role);
  }
  if (options.search) {
    const term = `%${options.search.toLowerCase()}%`;
    conditions.push(`(
      LOWER(u.first_name) LIKE ? OR LOWER(COALESCE(u.last_name, '')) LIKE ?
      OR LOWER(CONCAT(u.first_name, ' ', COALESCE(u.last_name, ''))) LIKE ?
      OR LOWER(u.email) LIKE ? OR LOWER(COALESCE(u.phone, '')) LIKE ?
      OR CAST(u.id AS TEXT) LIKE ?
    )`);
    values.push(term, term, term, term, term, term);
  }
  return { where: conditions.join(' AND '), values };
};

const customerFilters = (options) => {
  const values = [];
  const conditions = ['c.is_deleted = 0', 's.is_deleted = 0'];
  if (options.status) {
    conditions.push('c.status = ?');
    values.push(options.status.toLowerCase());
  }
  if (options.shopId) {
    conditions.push('c.shop_id = ?');
    values.push(options.shopId);
  }
  if (options.search) {
    const term = `%${options.search.toLowerCase()}%`;
    conditions.push(`(
      LOWER(c.first_name) LIKE ? OR LOWER(COALESCE(c.last_name, '')) LIKE ?
      OR LOWER(CONCAT(c.first_name, ' ', COALESCE(c.last_name, ''))) LIKE ?
      OR LOWER(COALESCE(c.email, '')) LIKE ? OR LOWER(COALESCE(c.phone, '')) LIKE ?
      OR CAST(c.id AS TEXT) LIKE ? OR LOWER(s.name) LIKE ?
    )`);
    values.push(term, term, term, term, term, term, term);
  }
  return { where: conditions.join(' AND '), values };
};

const bookingFilters = (options) => {
  const values = [];
  const conditions = ['b.is_deleted = 0', 's.is_deleted = 0', 'c.is_deleted = 0'];
  if (options.status) {
    conditions.push('b.status = ?');
    values.push(options.status);
  }
  if (options.shopId) {
    conditions.push('b.shop_id = ?');
    values.push(options.shopId);
  }
  if (options.startDate) {
    conditions.push('b.booking_date >= ?::date');
    values.push(options.startDate);
  }
  if (options.endDate) {
    conditions.push("b.booking_date < (?::date + INTERVAL '1 day')");
    values.push(options.endDate);
  }
  if (options.search) {
    const term = `%${options.search.toLowerCase()}%`;
    conditions.push(`(
      LOWER(b.booking_number) LIKE ? OR LOWER(s.name) LIKE ?
      OR LOWER(CONCAT(c.first_name, ' ', COALESCE(c.last_name, ''))) LIKE ?
      OR LOWER(COALESCE(c.phone, '')) LIKE ? OR CAST(b.id AS TEXT) LIKE ?
    )`);
    values.push(term, term, term, term, term);
  }
  return { where: conditions.join(' AND '), values };
};

export const getPlatformOverview = async (days) => {
  const [summary, trend, recentShops, recentBookings] = await Promise.all([
    queryOne(
      `SELECT
        (SELECT COUNT(*)::INT FROM shops WHERE is_deleted = 0) AS total_shops,
        (SELECT COUNT(*)::INT FROM shops WHERE is_deleted = 0 AND status = 'active') AS active_shops,
        (SELECT COUNT(*)::INT FROM shops WHERE is_deleted = 0 AND status = 'pending') AS pending_shops,
        (SELECT COUNT(*)::INT FROM shops WHERE is_deleted = 0 AND status = 'inactive') AS inactive_shops,
        (SELECT COUNT(*)::INT FROM shops WHERE is_deleted = 0 AND status = 'suspended') AS suspended_shops,
        (SELECT COUNT(*)::INT FROM users WHERE is_deleted = 0) AS total_users,
        (SELECT COUNT(*)::INT FROM customers WHERE is_deleted = 0) AS total_customers,
        (SELECT COUNT(*)::INT FROM bookings WHERE is_deleted = 0) AS total_bookings,
        (SELECT COUNT(*)::INT FROM shops WHERE is_deleted = 0 AND created_at >= CURRENT_DATE - (?::INT - 1)) AS new_shops,
        (SELECT COUNT(*)::INT FROM users WHERE is_deleted = 0 AND created_at >= CURRENT_DATE - (?::INT - 1)) AS new_users`,
      [days, days],
    ),
    queryRows(
      `WITH dates AS (
        SELECT generate_series(CURRENT_DATE - (?::INT - 1), CURRENT_DATE, INTERVAL '1 day')::DATE AS day
      ), shop_counts AS (
        SELECT created_at::DATE AS day, COUNT(*)::INT AS total
        FROM shops WHERE is_deleted = 0 AND created_at >= CURRENT_DATE - (?::INT - 1)
        GROUP BY created_at::DATE
      ), user_counts AS (
        SELECT created_at::DATE AS day, COUNT(*)::INT AS total
        FROM users WHERE is_deleted = 0 AND created_at >= CURRENT_DATE - (?::INT - 1)
        GROUP BY created_at::DATE
      ), booking_counts AS (
        SELECT booking_date::DATE AS day, COUNT(*)::INT AS total
        FROM bookings WHERE is_deleted = 0 AND booking_date >= CURRENT_DATE - (?::INT - 1)
        GROUP BY booking_date::DATE
      )
      SELECT TO_CHAR(dates.day, 'YYYY-MM-DD') AS date,
        COALESCE(shop_counts.total, 0)::INT AS shops,
        COALESCE(user_counts.total, 0)::INT AS users,
        COALESCE(booking_counts.total, 0)::INT AS bookings
      FROM dates
      LEFT JOIN shop_counts USING (day)
      LEFT JOIN user_counts USING (day)
      LEFT JOIN booking_counts USING (day)
      ORDER BY dates.day`,
      [days, days, days, days],
    ),
    queryRows(
      `SELECT s.id, s.name, s.email, s.city, s.state, s.status, s.created_at AS "createdAt",
        owner.name AS "ownerName", owner.email AS "ownerEmail"
      FROM shops s
      LEFT JOIN LATERAL (
        SELECT CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS name, u.email
        FROM user_shop_memberships m
        JOIN users u ON u.id = m.user_id AND u.is_deleted = 0
        WHERE m.shop_id = s.id AND m.role = 'OWNER' AND m.deleted_at IS NULL AND m.status <> 'removed'
        ORDER BY m.is_default DESC, m.created_at ASC
        LIMIT 1
      ) owner ON TRUE
      WHERE s.is_deleted = 0
      ORDER BY s.created_at DESC, s.id DESC
      LIMIT 8`,
    ),
    queryRows(
      `SELECT b.id, b.booking_number AS "bookingNumber", b.status,
        b.booking_date AS "bookingDate", b.total_amount AS "totalAmount",
        s.id AS "shopId", s.name AS "shopName",
        CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS "customerName"
      FROM bookings b
      JOIN shops s ON s.id = b.shop_id
      JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
      WHERE b.is_deleted = 0 AND s.is_deleted = 0 AND c.is_deleted = 0
      ORDER BY b.booking_date DESC, b.id DESC
      LIMIT 8`,
    ),
  ]);

  return { summary, trend, recentShops, recentBookings };
};

export const countPlatformShops = async (options) => {
  const { where, values } = shopFilters(options);
  const row = await queryOne(`SELECT COUNT(*)::INT AS total FROM shops s WHERE ${where}`, values);
  return Number(row.total || 0);
};

export const listPlatformShops = async (options) => {
  const { where, values } = shopFilters(options);
  const { limit, offset } = buildPagination(options);
  const sortColumns = { name: 's.name', createdAt: 's.created_at', status: 's.status' };
  const sortColumn = sortColumns[options.sortBy] || sortColumns.createdAt;
  return queryRows(
    `SELECT s.id, s.name, s.slug, s.legal_name AS "businessName", s.email, s.phone,
      s.city, s.state, s.status, s.created_at AS "createdAt",
      owner.id AS "ownerId", owner.name AS "ownerName", owner.email AS "ownerEmail",
      COALESCE(member_counts.total, 0)::INT AS "userCount",
      COALESCE(booking_counts.total, 0)::INT AS "bookingCount"
    FROM shops s
    LEFT JOIN LATERAL (
      SELECT u.id, CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS name, u.email
      FROM user_shop_memberships m
      JOIN users u ON u.id = m.user_id AND u.is_deleted = 0
      WHERE m.shop_id = s.id AND m.role = 'OWNER' AND m.deleted_at IS NULL AND m.status <> 'removed'
      ORDER BY m.is_default DESC, m.created_at ASC
      LIMIT 1
    ) owner ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(DISTINCT m.user_id)::INT AS total
      FROM user_shop_memberships m
      JOIN users u ON u.id = m.user_id AND u.is_deleted = 0
      WHERE m.shop_id = s.id AND m.deleted_at IS NULL AND m.status <> 'removed'
    ) member_counts ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INT AS total FROM bookings b
      WHERE b.shop_id = s.id AND b.is_deleted = 0
    ) booking_counts ON TRUE
    WHERE ${where}
    ORDER BY ${sortColumn} ${options.sortOrder === 'asc' ? 'ASC' : 'DESC'}, s.id DESC
    LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );
};

export const getPlatformShopDetails = async (shopId) => {
  const shop = await queryOne(
    `SELECT s.id, s.name, s.slug, s.legal_name AS "businessName", s.email, s.phone,
      s.address_line1 AS address, s.address_line2 AS "addressLine2", s.city, s.state,
      s.postal_code AS pincode, s.country, s.gst_number AS "gstNumber", s.status,
      s.created_at AS "createdAt",
      owner.id AS "ownerId", owner.name AS "ownerName", owner.email AS "ownerEmail",
      owner.phone AS "ownerPhone",
      (SELECT COUNT(*)::INT FROM bookings b WHERE b.shop_id = s.id AND b.is_deleted = 0) AS "bookingCount",
      (SELECT COUNT(*)::INT FROM bookings b WHERE b.shop_id = s.id AND b.is_deleted = 0 AND b.status = 'PENDING') AS "pendingBookings",
      (SELECT COUNT(*)::INT FROM bookings b WHERE b.shop_id = s.id AND b.is_deleted = 0 AND b.status = 'COMPLETED') AS "completedBookings",
      (SELECT COUNT(*)::INT FROM bookings b WHERE b.shop_id = s.id AND b.is_deleted = 0 AND b.status = 'CANCELLED') AS "cancelledBookings",
      (SELECT COUNT(*)::INT FROM products p WHERE p.shop_id = s.id AND p.is_deleted = 0) AS "productCount"
    FROM shops s
    LEFT JOIN LATERAL (
      SELECT u.id, CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS name,
        u.email, u.phone
      FROM user_shop_memberships m
      JOIN users u ON u.id = m.user_id AND u.is_deleted = 0
      WHERE m.shop_id = s.id AND m.role = 'OWNER' AND m.deleted_at IS NULL AND m.status <> 'removed'
      ORDER BY m.is_default DESC, m.created_at ASC
      LIMIT 1
    ) owner ON TRUE
    WHERE s.id = ? AND s.is_deleted = 0`,
    [shopId],
  );
  if (!shop.id) return null;
  const [users, bookings] = await Promise.all([
    queryRows(
      `SELECT u.id, CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS name,
        u.email, u.phone, u.status AS "accountStatus", m.role,
        m.status AS "membershipStatus", m.created_at AS "joinedAt"
      FROM user_shop_memberships m
      JOIN users u ON u.id = m.user_id AND u.is_deleted = 0
      WHERE m.shop_id = ? AND m.deleted_at IS NULL AND m.status <> 'removed'
      ORDER BY CASE m.role WHEN 'OWNER' THEN 0 ELSE 1 END, u.first_name, u.id`,
      [shopId],
    ),
    queryRows(
      `SELECT b.id, b.booking_number AS "bookingNumber", b.status,
        b.booking_date AS "bookingDate", b.rental_start_date AS "rentalStartDate",
        b.rental_end_date AS "rentalEndDate", b.total_amount AS "totalAmount",
        CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS "customerName"
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
      WHERE b.shop_id = ? AND b.is_deleted = 0 AND c.is_deleted = 0
      ORDER BY b.booking_date DESC, b.id DESC
      LIMIT 10`,
      [shopId],
    ),
  ]);
  return { ...shop, users, recentBookings: bookings };
};

export const setPlatformShopStatus = async (shopId, status, connection = pool) => {
  await connection.query(
    'UPDATE shops SET status = ? WHERE id = ? AND is_deleted = 0',
    [status, shopId],
  );
  const [rows] = await connection.query(
    'SELECT id, name, status FROM shops WHERE id = ? AND is_deleted = 0 LIMIT 1',
    [shopId],
  );
  return rows[0] || null;
};

export const countPlatformUsers = async (options) => {
  const { where, values } = userFilters(options);
  const row = await queryOne(`SELECT COUNT(*)::INT AS total FROM users u WHERE ${where}`, values);
  return Number(row.total || 0);
};

export const listPlatformUsers = async (options) => {
  const { where, values } = userFilters(options);
  const { limit, offset } = buildPagination(options);
  const sortColumns = { name: 'u.first_name', createdAt: 'u.created_at', status: 'u.status' };
  const sortColumn = sortColumns[options.sortBy] || sortColumns.createdAt;
  return queryRows(
    `SELECT u.id, u.first_name AS "firstName", u.last_name AS "lastName",
      CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS name,
      u.email, u.phone, u.status, u.is_owner AS "isOwner", u.created_at AS "createdAt",
      COALESCE(memberships.roles, '') AS roles,
      COALESCE(platform_roles.roles, '') AS "platformRoles",
      COALESCE(memberships.shops, '') AS shops,
      COALESCE(memberships.shop_count, 0)::INT AS "shopCount"
    FROM users u
    LEFT JOIN LATERAL (
      SELECT string_agg(DISTINCT m.role, ', ' ORDER BY m.role) AS roles,
        string_agg(DISTINCT s.name, ', ' ORDER BY s.name) AS shops,
        COUNT(DISTINCT m.shop_id)::INT AS shop_count
      FROM user_shop_memberships m
      JOIN shops s ON s.id = m.shop_id AND s.is_deleted = 0
      WHERE m.user_id = u.id AND m.deleted_at IS NULL AND m.status <> 'removed'
    ) memberships ON TRUE
    LEFT JOIN LATERAL (
      SELECT string_agg(platform_role.role, ', ' ORDER BY platform_role.role) AS roles
      FROM platform_user_roles platform_role
      WHERE platform_role.user_id = u.id
    ) platform_roles ON TRUE
    WHERE ${where}
    ORDER BY ${sortColumn} ${options.sortOrder === 'asc' ? 'ASC' : 'DESC'}, u.id DESC
    LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );
};

export const countPlatformCustomers = async (options) => {
  const { where, values } = customerFilters(options);
  const row = await queryOne(
    `SELECT COUNT(*)::INT AS total FROM customers c JOIN shops s ON s.id = c.shop_id WHERE ${where}`,
    values,
  );
  return Number(row.total || 0);
};

export const listPlatformCustomers = async (options) => {
  const { where, values } = customerFilters(options);
  const { limit, offset } = buildPagination(options);
  const sortColumns = { name: 'c.first_name', createdAt: 'c.created_at', status: 'c.status' };
  const sortColumn = sortColumns[options.sortBy] || sortColumns.createdAt;
  return queryRows(
    `SELECT c.id, c.shop_id AS "shopId", s.name AS "shopName",
      c.first_name AS "firstName", c.last_name AS "lastName",
      CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS name,
      c.phone, c.email, c.city, c.state, c.status, c.created_at AS "createdAt"
    FROM customers c JOIN shops s ON s.id = c.shop_id
    WHERE ${where}
    ORDER BY ${sortColumn} ${options.sortOrder === 'asc' ? 'ASC' : 'DESC'}, c.id DESC
    LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );
};

export const countPlatformBookings = async (options) => {
  const { where, values } = bookingFilters(options);
  const row = await queryOne(
    `SELECT COUNT(*)::INT AS total FROM bookings b
     JOIN shops s ON s.id = b.shop_id
     JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
     WHERE ${where}`,
    values,
  );
  return Number(row.total || 0);
};

export const listPlatformBookings = async (options) => {
  const { where, values } = bookingFilters(options);
  const { limit, offset } = buildPagination(options);
  const sortColumns = { bookingDate: 'b.booking_date', rentalStartDate: 'b.rental_start_date', totalAmount: 'b.total_amount' };
  const sortColumn = sortColumns[options.sortBy] || sortColumns.bookingDate;
  return queryRows(
    `SELECT b.id, b.shop_id AS "shopId", s.name AS "shopName",
      b.booking_number AS "bookingNumber", b.booking_date AS "bookingDate",
      b.rental_start_date AS "rentalStartDate", b.rental_end_date AS "rentalEndDate",
      b.status, b.total_amount AS "totalAmount",
      c.id AS "customerId",
      CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) AS "customerName",
      (SELECT string_agg(p.name, ', ' ORDER BY p.name)
       FROM booking_items bi
       JOIN products p ON p.id = bi.product_id AND p.shop_id = bi.shop_id
       WHERE bi.booking_id = b.id AND bi.shop_id = b.shop_id AND bi.is_deleted = 0) AS "itemSummary"
    FROM bookings b
    JOIN shops s ON s.id = b.shop_id
    JOIN customers c ON c.id = b.customer_id AND c.shop_id = b.shop_id
    WHERE ${where}
    ORDER BY ${sortColumn} ${options.sortOrder === 'asc' ? 'ASC' : 'DESC'}, b.id DESC
    LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );
};
