import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/config/database.js';
import { createInventoryItemForShop } from '../src/services/inventory.service.js';
import { changeBookingStatusForShop, createBookingForShop } from '../src/services/booking.service.js';
import { checkInventoryAvailability } from '../src/services/availability.service.js';

const enabled = process.env.RUN_DB_INTEGRATION === '1';

test('booking availability serializes concurrent requests and applies buffer/cancellation rules', { skip: !enabled }, async () => {
  const suffix = randomUUID().replace(/-/g, '');
  let shopId;
  let inventoryItemId;
  try {
    const [shopResult] = await pool.query(
      'INSERT INTO shops (name, slug, status) VALUES (?, ?, ?)',
      [`Booking Integration ${suffix}`, `booking-test-${suffix}`, 'active'],
    );
    shopId = shopResult.insertId;
    const [categoryResult] = await pool.query(
      "INSERT INTO categories (shop_id, name, slug, status) VALUES (?, ?, ?, 'active')",
      [shopId, `Booking Test ${suffix}`, `booking-category-${suffix}`],
    );
    const [productResult] = await pool.query(
      `INSERT INTO products (shop_id, category_id, sku, name, slug, product_type, daily_rental_rate, security_deposit, status)
       VALUES (?, ?, ?, ?, ?, 'garment', 3500.00, 5000.00, 'active')`,
      [shopId, categoryResult.insertId, `BK-${suffix.slice(0, 12)}`, 'Booking Integration Product', `booking-product-${suffix}`],
    );
    const [customerResult] = await pool.query(
      "INSERT INTO customers (shop_id, first_name, phone, status) VALUES (?, 'Integration Customer', ?, 'active')",
      [shopId, `9${suffix.slice(0, 9)}`],
    );
    const inventory = await createInventoryItemForShop(shopId, {
      productId: productResult.insertId,
      sku: `PIECE-${suffix.slice(0, 16)}`,
    }, { userId: null, ipAddress: '127.0.0.1' });
    inventoryItemId = inventory.id;
    const payload = {
      customerId: customerResult.insertId,
      rentalStartDate: '2026-10-10',
      rentalEndDate: '2026-10-12',
      items: [{ productId: productResult.insertId, inventoryItemId }],
    };
    const audit = { userId: null, ipAddress: '127.0.0.1' };

    const results = await Promise.allSettled([
      createBookingForShop(shopId, null, payload, audit),
      createBookingForShop(shopId, null, payload, audit),
    ]);
    const created = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    assert.equal(created.length, 1, JSON.stringify(results.map((result) => result.status === 'rejected'
      ? { code: result.reason.code, message: result.reason.message, sqlMessage: result.reason.sqlMessage }
      : { status: result.status })));
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.code, 'INVENTORY_NOT_AVAILABLE');
    const booking = created[0].value;
    assert.match(booking.bookingNumber, /^BK-2026-\d{5,}$/);
    assert.equal(booking.status, 'PENDING');

    const availability = await checkInventoryAvailability(shopId, {
      inventoryItemId,
      startDate: '2026-10-10',
      endDate: '2026-10-12',
    });
    assert.equal(availability.available, false);

    await assert.rejects(
      createBookingForShop(shopId, null, { ...payload, rentalStartDate: '2026-10-13', rentalEndDate: '2026-10-15' }, audit),
      (error) => error.code === 'INVENTORY_NOT_AVAILABLE',
    );
    const afterBuffer = await createBookingForShop(shopId, null, { ...payload, rentalStartDate: '2026-10-14', rentalEndDate: '2026-10-16' }, audit);
    assert.equal(afterBuffer.status, 'PENDING');

    await changeBookingStatusForShop(shopId, booking.id, 'CANCELLED', audit);
    const afterCancel = await checkInventoryAvailability(shopId, {
      inventoryItemId,
      startDate: '2026-10-10',
      endDate: '2026-10-12',
    });
    assert.equal(afterCancel.available, true);
  } finally {
    if (shopId) {
      await pool.query('DELETE FROM audit_logs WHERE shop_id = ?', [shopId]);
      await pool.query('DELETE FROM bookings WHERE shop_id = ?', [shopId]);
      await pool.query('DELETE FROM inventory_items WHERE shop_id = ?', [shopId]);
      await pool.query('DELETE FROM products WHERE shop_id = ?', [shopId]);
      await pool.query('DELETE FROM customers WHERE shop_id = ?', [shopId]);
      await pool.query('DELETE FROM categories WHERE shop_id = ?', [shopId]);
      await pool.query('DELETE FROM shops WHERE id = ?', [shopId]);
    }
    await pool.end();
  }
});