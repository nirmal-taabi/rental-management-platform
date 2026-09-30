import { pool } from '../config/database.js';
import { createAuditLog } from './audit.repository.js';

let fullTextIndexAvailable;

const hasFullTextIndex = async (connection) => {
  if (fullTextIndexAvailable !== undefined) return fullTextIndexAvailable;
  try {
    // PostgreSQL: check pg_indexes for the GIN search index
    const [rows] = await connection.query(
      `SELECT COUNT(*) AS total FROM pg_indexes
       WHERE tablename = 'products' AND indexname = 'idx_products_catalog_search'`,
      [],
    );
    fullTextIndexAvailable = Number(rows[0]?.total || 0) > 0;
  } catch {
    fullTextIndexAvailable = false;
  }
  return fullTextIndexAvailable;
};

const mapProductRow = (row = {}, images = []) => ({
  id: row.id,
  shopId: row.shop_id,
  categoryId: row.category_id,
  categoryName: row.category_name || null,
  name: row.name,
  sku: row.sku,
  brand: row.brand,
  productType: String(row.product_type || 'other').toUpperCase(),
  description: row.description,
  rentalPrice: String(row.rental_price ?? row.daily_rental_rate ?? '0.00'),
  depositAmount: String(row.security_deposit ?? '0.00'),
  status: String(row.status || 'draft').toUpperCase(),
  primaryImage: row.primary_image_url || images.find((image) => image.isPrimary)?.imageUrl || null,
  images,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapImageRow = (row = {}) => ({
  id: row.id,
  imageUrl: row.image_url,
  isPrimary: Boolean(row.is_primary),
  sortOrder: Number(row.sort_order || 0),
});

const baseSelect = `SELECT p.*, p.daily_rental_rate AS rental_price, c.name AS category_name,
  (SELECT pi.image_url FROM product_images pi
   WHERE pi.shop_id = p.shop_id AND pi.product_id = p.id AND pi.is_deleted = 0
   ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC LIMIT 1) AS primary_image_url
  FROM products p LEFT JOIN categories c ON c.id = p.category_id AND c.shop_id = p.shop_id`;

const buildFilters = (shopId, options = {}, useFullText = false) => {
  const values = [shopId];
  let where = 'p.shop_id = ? AND p.is_deleted = 0';
  if (options.status) {
    where += ' AND p.status = ?';
    values.push(String(options.status).toLowerCase());
  }
  if (options.categoryId) {
    where += ' AND p.category_id = ?';
    values.push(options.categoryId);
  }
  if (options.search) {
    const term = `%${String(options.search).trim()}%`;
    if (useFullText) {
      // PostgreSQL: use tsvector/tsquery for full-text, fallback to LIKE for partial matches
      where += ` AND (search_vector @@ plainto_tsquery('english', ?)
        OR p.name ILIKE ? OR p.sku ILIKE ? OR p.description ILIKE ?)`;
      values.push(String(options.search).trim(), term, term, term);
    } else {
      where += ' AND (p.name ILIKE ? OR p.sku ILIKE ? OR p.description ILIKE ?)';
      values.push(term, term, term);
    }
  }
  return { where, values };
};

export const mapProductRecord = mapProductRow;

export const findProductsByShop = async (shopId, options = {}, connection = pool) => {
  const page = Math.max(1, Number(options.page || 1));
  const limit = Math.min(100, Math.max(1, Number(options.limit || 20)));
  const offset = (page - 1) * limit;
  const { where, values } = buildFilters(shopId, options, options.search ? await hasFullTextIndex(connection) : false);
  const sortColumns = {
    created_at: 'p.created_at',
    updated_at: 'p.updated_at',
    name: 'p.name',
    sku: 'p.sku',
    rental_price: 'p.daily_rental_rate',
    status: 'p.status',
  };
  const sortBy = sortColumns[options.sortBy] || sortColumns.created_at;
  const sortOrder = String(options.sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const [rows] = await connection.query(
    `${baseSelect} WHERE ${where} ORDER BY ${sortBy} ${sortOrder}, p.id DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );
  return rows.map((row) => mapProductRow(row));
};

export const countProductsByShop = async (shopId, options = {}, connection = pool) => {
  const { where, values } = buildFilters(shopId, options, options.search ? await hasFullTextIndex(connection) : false);
  const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM products p WHERE ${where}`, values);
  return Number(rows[0]?.total || 0);
};

export const findProductImages = async (shopId, productId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT id, image_url, is_primary, sort_order FROM product_images
     WHERE shop_id = ? AND product_id = ? AND is_deleted = 0
     ORDER BY sort_order ASC, id ASC`,
    [shopId, productId],
  );
  return rows.map(mapImageRow);
};

export const findProductById = async (shopId, productId, connection = pool) => {
  const [rows] = await connection.query(`${baseSelect} WHERE p.id = ? AND p.shop_id = ? AND p.is_deleted = 0 LIMIT 1`, [productId, shopId]);
  if (!rows[0]) return null;
  const images = await findProductImages(shopId, productId, connection);
  return mapProductRow(rows[0], images);
};

export const findProductBySku = async (shopId, sku, excludeId) => {
  const values = [shopId, sku];
  let query = 'SELECT id FROM products WHERE shop_id = ? AND sku = ?';
  if (excludeId) {
    query += ' AND id <> ?';
    values.push(excludeId);
  }
  query += ' LIMIT 1';
  const [rows] = await pool.query(query, values);
  return rows[0] || null;
};

export const findHighestProductSkuSequence = async (shopId, prefix) => {
  // PostgreSQL: use ~ for regex and SPLIT_PART instead of SUBSTRING_INDEX
  const [rows] = await pool.query(
    `SELECT MAX(CAST(SPLIT_PART(sku, '-', -1) AS INTEGER)) AS max_sequence
     FROM products WHERE shop_id = ? AND sku ~ ?`,
    [shopId, `^${prefix}-[0-9]+$`],
  );
  return Number(rows[0]?.max_sequence || 0);
};

const insertImages = async (shopId, productId, images, connection) => {
  for (const image of images) {
    await connection.query(
      `INSERT INTO product_images (shop_id, product_id, image_url, is_primary, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [shopId, productId, image.imageUrl, image.isPrimary ? 1 : 0, image.sortOrder],
    );
  }
};

export const createProductRecord = async (shopId, payload, images, audit) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO products (shop_id, category_id, sku, name, slug, brand, product_type, description, daily_rental_rate, security_deposit, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [shopId, payload.categoryId, payload.sku, payload.name, payload.slug, payload.brand || null, payload.productType.toLowerCase(), payload.description || null, payload.rentalPrice, payload.depositAmount],
    );
    await insertImages(shopId, result.insertId, images, connection);
    const product = await findProductById(shopId, result.insertId, connection);
    await createAuditLog({ ...audit, shopId, entityType: 'product', entityId: result.insertId, action: 'created', newValues: { ...product, imageCount: images.length } }, connection);
    if (images.length) {
      await createAuditLog({ ...audit, shopId, entityType: 'product', entityId: result.insertId, action: 'images_added', newValues: { images: product.images } }, connection);
    }
    await connection.commit();
    return product;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateProductRecord = async (shopId, productId, payload, images, audit) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const previous = await findProductById(shopId, productId, connection);
    if (!previous) {
      await connection.rollback();
      return null;
    }
    await connection.query(
      `UPDATE products SET category_id = ?, sku = ?, name = ?, slug = ?, brand = ?, product_type = ?, description = ?,
       daily_rental_rate = ?, security_deposit = ?
       WHERE id = ? AND shop_id = ? AND is_deleted = 0`,
      [payload.categoryId, payload.sku, payload.name, payload.slug, payload.brand || null, payload.productType.toLowerCase(), payload.description || null, payload.rentalPrice, payload.depositAmount, productId, shopId],
    );

    const retainedIds = images.filter((image) => image.id).map((image) => image.id);
    if (retainedIds.length) {
      const placeholders = retainedIds.map(() => '?').join(', ');
      await connection.query(
        `UPDATE product_images SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP
         WHERE shop_id = ? AND product_id = ? AND is_deleted = 0 AND id NOT IN (${placeholders})`,
        [shopId, productId, ...retainedIds],
      );
    } else {
      await connection.query(
        'UPDATE product_images SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE shop_id = ? AND product_id = ? AND is_deleted = 0',
        [shopId, productId],
      );
    }

    for (const image of images) {
      if (image.id) {
        await connection.query(
          `UPDATE product_images SET is_primary = ?, sort_order = ?, is_deleted = 0, deleted_at = NULL
           WHERE id = ? AND shop_id = ? AND product_id = ?`,
          [image.isPrimary ? 1 : 0, image.sortOrder, image.id, shopId, productId],
        );
      } else {
        await insertImages(shopId, productId, [image], connection);
      }
    }

    const product = await findProductById(shopId, productId, connection);
    await createAuditLog({ ...audit, shopId, entityType: 'product', entityId: productId, action: 'updated', oldValues: { ...previous, images: undefined }, newValues: { ...product, imageCount: images.length } }, connection);
    const previousImages = previous.images.map((image) => ({ id: image.id, imageUrl: image.imageUrl, isPrimary: image.isPrimary, sortOrder: image.sortOrder }));
    const updatedImages = images.map((image) => ({ id: image.id || null, imageUrl: image.imageUrl, isPrimary: image.isPrimary, sortOrder: image.sortOrder }));
    if (JSON.stringify(previousImages) !== JSON.stringify(updatedImages)) {
      await createAuditLog({ ...audit, shopId, entityType: 'product', entityId: productId, action: 'images_updated', oldValues: { images: previousImages }, newValues: { images: updatedImages } }, connection);
    }
    await connection.commit();
    return product;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateProductStatusRecord = async (shopId, productId, status, audit) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const previous = await findProductById(shopId, productId, connection);
    if (!previous) {
      await connection.rollback();
      return null;
    }
    await connection.query('UPDATE products SET status = ? WHERE id = ? AND shop_id = ? AND is_deleted = 0', [status.toLowerCase(), productId, shopId]);
    const product = await findProductById(shopId, productId, connection);
    await createAuditLog({ ...audit, shopId, entityType: 'product', entityId: productId, action: status === 'ACTIVE' ? 'activated' : 'deactivated', oldValues: previous, newValues: product }, connection);
    await connection.commit();
    return product;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const findProductImageForShop = async (shopId, imageUrl, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT pi.image_url FROM product_images pi
     INNER JOIN products p ON p.id = pi.product_id AND p.shop_id = pi.shop_id
     WHERE pi.shop_id = ? AND p.shop_id = ? AND pi.image_url = ?
       AND pi.is_deleted = 0 AND p.is_deleted = 0 LIMIT 1`,
    [shopId, shopId, imageUrl],
  );
  return rows[0]?.image_url || null;
};