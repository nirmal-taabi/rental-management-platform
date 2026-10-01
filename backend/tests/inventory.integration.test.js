import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/config/database.js';
import {
  createInventoryItemForShop,
  getInventoryForShop,
  getInventoryItemForShop,
  getInventorySummaryForShop,
  retireInventoryItemForShop,
  updateInventoryItemConditionForShop,
  updateInventoryItemForShop,
  updateInventoryItemStatusForShop,
} from '../src/services/inventory.service.js';

const enabled = process.env.RUN_DB_INTEGRATION === '1';

test('inventory CRUD, constraints, transitions, and tenant isolation against PostgreSQL', { skip: !enabled }, async () => {
  const suffix = randomUUID().replace(/-/g, '');
  const shopIds = [];
  try {
    for (let index = 0; index < 2; index += 1) {
      const [result] = await pool.query('INSERT INTO shops (name, slug, status) VALUES (?, ?, ?)', [`Inventory Integration ${index}`, `inventory-test-${index}-${suffix}`, 'active']);
      shopIds.push(result.insertId);
    }
    const [shopA, shopB] = shopIds;
    const [categoryAResult] = await pool.query('INSERT INTO categories (shop_id, name, slug, status) VALUES (?, ?, ?, \'active\')', [shopA, `Inventory Test A ${suffix}`, `inventory-a-${suffix}`]);
    const [categoryBResult] = await pool.query('INSERT INTO categories (shop_id, name, slug, status) VALUES (?, ?, ?, \'active\')', [shopB, `Inventory Test B ${suffix}`, `inventory-b-${suffix}`]);
    const productSku = `INV-${suffix.slice(0, 12).toUpperCase()}`;
    const [productAResult] = await pool.query(
      `INSERT INTO products (shop_id, category_id, sku, name, slug, product_type, daily_rental_rate, security_deposit, status)
       VALUES (?, ?, ?, ?, ?, 'garment', 0, 0, 'active')`,
      [shopA, categoryAResult.insertId, productSku, 'Inventory Test Product A', `inventory-product-a-${suffix}`],
    );
    const [productBResult] = await pool.query(
      `INSERT INTO products (shop_id, category_id, sku, name, slug, product_type, daily_rental_rate, security_deposit, status)
       VALUES (?, ?, ?, ?, ?, 'garment', 0, 0, 'active')`,
      [shopB, categoryBResult.insertId, `${productSku}-B`, 'Inventory Test Product B', `inventory-product-b-${suffix}`],
    );
    const productA = { id: productAResult.insertId };
    const productB = { id: productBResult.insertId };
    const audit = { userId: null, ipAddress: '127.0.0.1' };
    const sku = `ITEM-${suffix.slice(0, 16).toUpperCase()}`;
    const itemA = await createInventoryItemForShop(shopA, { productId: productA.id, sku, barcode: `BAR-${suffix}`, size: 'M', color: 'Red' }, audit);
    const itemB = await createInventoryItemForShop(shopB, { productId: productB.id, sku, barcode: `BAR-B-${suffix}` }, audit);

    assert.equal(itemA.status, 'AVAILABLE');
    assert.equal(itemA.condition, 'GOOD');
    assert.equal(itemA.product.id, productA.id);
    assert.equal(itemB.sku, itemA.sku, 'item SKU is unique per shop, not globally');
    await assert.rejects(getInventoryItemForShop(shopA, itemB.id), (error) => error.code === 'INVENTORY_ITEM_NOT_FOUND');
    await assert.rejects(updateInventoryItemForShop(shopA, itemB.id, { sku: `${sku}-X` }, audit), (error) => error.code === 'INVENTORY_ITEM_NOT_FOUND');
    await assert.rejects(updateInventoryItemStatusForShop(shopA, itemB.id, { status: 'DAMAGED' }, audit), (error) => error.code === 'INVENTORY_ITEM_NOT_FOUND');
    await assert.rejects(createInventoryItemForShop(shopA, { productId: productB.id, sku: `${sku}-C` }, audit), (error) => error.code === 'INVENTORY_PRODUCT_MISMATCH');
    await assert.rejects(createInventoryItemForShop(shopA, { productId: productA.id, sku, barcode: `BAR-${suffix}` }, audit), (error) => error.code === 'INVENTORY_SKU_EXISTS');
    await assert.rejects(createInventoryItemForShop(shopA, { productId: productA.id, sku: `${sku}-BAR`, barcode: `BAR-${suffix}` }, audit), (error) => error.code === 'INVENTORY_BARCODE_EXISTS');

    const updated = await updateInventoryItemForShop(shopA, itemA.id, { color: 'Ruby', condition: 'FAIR' }, audit);
    assert.equal(updated.color, 'Ruby');
    assert.equal(updated.condition, 'FAIR');
    await updateInventoryItemConditionForShop(shopA, itemA.id, { condition: 'GOOD' }, audit);
    await updateInventoryItemStatusForShop(shopA, itemA.id, { status: 'CLEANING' }, audit);
    assert.equal((await getInventoryItemForShop(shopA, itemA.id)).status, 'CLEANING');
    await updateInventoryItemStatusForShop(shopA, itemA.id, { status: 'AVAILABLE' }, audit);
    await updateInventoryItemStatusForShop(shopA, itemA.id, { status: 'LOST' }, audit);
    await assert.rejects(updateInventoryItemStatusForShop(shopA, itemA.id, { status: 'AVAILABLE' }, audit), (error) => error.code === 'INVENTORY_STATUS_TRANSITION_INVALID');

    const list = await getInventoryForShop(shopA, { search: 'ITEM-', status: 'LOST', page: 1, limit: 1, sortBy: 'sku' });
    assert.equal(list.pagination.totalItems, 1);
    assert.equal(list.data[0].id, itemA.id);
    assert.equal((await getInventorySummaryForShop(shopA)).lost, 1);
    await retireInventoryItemForShop(shopA, itemA.id, audit);
    assert.equal((await getInventoryItemForShop(shopA, itemA.id)).status, 'RETIRED');
  } finally {
    if (shopIds.length) {
      const placeholders = shopIds.map(() => '?').join(', ');
      await pool.query(`DELETE FROM inventory_items WHERE shop_id IN (${placeholders})`, shopIds);
      await pool.query(`DELETE FROM products WHERE shop_id IN (${placeholders})`, shopIds);
      await pool.query(`DELETE FROM categories WHERE shop_id IN (${placeholders})`, shopIds);
      await pool.query(`DELETE FROM shops WHERE id IN (${placeholders})`, shopIds);
    }
    await pool.end();
  }
});