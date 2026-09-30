import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/config/database.js';
import { createInventoryItemForShop } from '../src/services/inventory.service.js';
import { createBookingForShop, changeBookingStatusForShop } from '../src/services/booking.service.js';
import {
  confirmBookingPickup,
  getBookingReturnHistoryForShop,
  getBookingPickupForShop,
  getInventoryReturnHistoryForShop,
  listReturnsForShop,
  getReturnForShop,
  recordBookingReturn,
} from '../src/services/lifecycle.service.js';

const enabled = process.env.RUN_DB_INTEGRATION === '1';

test('pickup is atomic and partial/full returns update inventory, booking, lateness, history, and tenant scope', { skip: !enabled }, async () => {
  const suffix = randomUUID().replace(/-/g, '');
  const shopIds = [];
  try {
    for (let index = 0; index < 2; index += 1) {
      const [shop] = await pool.query('INSERT INTO shops (name, slug, status) VALUES (?, ?, ?)', [
        `Lifecycle Integration ${index} ${suffix}`, `lifecycle-${index}-${suffix}`, 'active',
      ]);
      shopIds.push(shop.insertId);
    }
    const shopId = shopIds[0];
    const [category] = await pool.query(
      "INSERT INTO categories (shop_id, name, slug, status) VALUES (?, ?, ?, 'active')",
      [shopId, `Lifecycle ${suffix}`, `lifecycle-category-${suffix}`],
    );
    const [product] = await pool.query(
      `INSERT INTO products (shop_id, category_id, sku, name, slug, product_type, daily_rental_rate, security_deposit, status)
       VALUES (?, ?, ?, ?, ?, 'garment', 100.00, 50.00, 'active')`,
      [shopId, category.insertId, `LIFE-${suffix.slice(0, 12)}`, 'Lifecycle Integration Product', `lifecycle-product-${suffix}`],
    );
    const [customer] = await pool.query(
      "INSERT INTO customers (shop_id, first_name, phone, status) VALUES (?, 'Lifecycle Customer', ?, 'active')",
      [shopId, `7${suffix.slice(0, 9)}`],
    );
    const inventory = [];
    for (let index = 0; index < 3; index += 1) {
      inventory.push(await createInventoryItemForShop(shopId, {
        productId: product.insertId,
        sku: `LIFE-${suffix.slice(0, 10)}-${index}`,
      }, { userId: null, ipAddress: '127.0.0.1' }));
    }
    const audit = { userId: null, ipAddress: '127.0.0.1' };
    const booking = await createBookingForShop(shopId, null, {
      customerId: customer.insertId,
      rentalStartDate: '2026-10-10',
      rentalEndDate: '2026-10-12',
      items: inventory.map((item) => ({ productId: product.insertId, inventoryItemId: item.id })),
    }, audit);
    await changeBookingStatusForShop(shopId, booking.id, 'CONFIRMED', audit);
    await changeBookingStatusForShop(shopId, booking.id, 'READY', audit);
    await assert.rejects(changeBookingStatusForShop(shopId, booking.id, 'ACTIVE', audit), (error) => error.code === 'PICKUP_REQUIRED');

    const pickupItems = booking.items.map((item) => ({ bookingItemId: item.id, inventoryItemId: item.inventoryItemId }));
    const pickups = await Promise.allSettled([
      confirmBookingPickup(shopId, booking.id, null, { items: pickupItems, pickupNotes: 'All pieces verified' }, audit),
      confirmBookingPickup(shopId, booking.id, null, { items: pickupItems, pickupNotes: 'Concurrent pickup' }, audit),
    ]);
    assert.equal(pickups.filter((result) => result.status === 'fulfilled').length, 1, JSON.stringify(pickups.map((result) => result.status === 'rejected'
      ? { code: result.reason.code, message: result.reason.message, sqlMessage: result.reason.sqlMessage }
      : { status: result.status })));
    assert.equal(pickups.filter((result) => result.status === 'rejected').length, 1, JSON.stringify(pickups.map((result) => result.status === 'fulfilled'
      ? { status: result.value.status, pickedUpAt: result.value.pickedUpAt, pickupNotes: result.value.pickupNotes }
      : { code: result.reason.code, message: result.reason.message })));
    const pickup = await getBookingPickupForShop(shopId, booking.id);
    assert.equal(pickup.status, 'ACTIVE');
    assert.equal(pickup.items.every((item) => item.inventoryStatus === 'RENTED'), true);

    const firstItem = booking.items[0];
    const concurrentReturn = await Promise.allSettled([
      recordBookingReturn(shopId, booking.id, null, {
        returnedAt: '2026-10-12T18:00:00Z',
        items: [{ bookingItemId: firstItem.id, inventoryItemId: firstItem.inventoryItemId, condition: 'GOOD', damageStatus: 'NONE' }],
      }, audit),
      recordBookingReturn(shopId, booking.id, null, {
        returnedAt: '2026-10-12T18:00:00Z',
        items: [{ bookingItemId: firstItem.id, inventoryItemId: firstItem.inventoryItemId, condition: 'GOOD', damageStatus: 'NONE' }],
      }, audit),
    ]);
    assert.equal(concurrentReturn.filter((result) => result.status === 'fulfilled').length, 1, JSON.stringify(concurrentReturn.map((result) => result.status === 'rejected'
      ? { code: result.reason.code, message: result.reason.message, sqlMessage: result.reason.sqlMessage }
      : { status: result.status, returnStatus: result.value.returnStatus })));
    assert.equal(concurrentReturn.filter((result) => result.status === 'rejected').length, 1);
    const partialReturn = concurrentReturn.find((result) => result.status === 'fulfilled').value;
    assert.equal(partialReturn.status, 'PARTIAL');
    assert.equal(partialReturn.returnStatus, 'ON_TIME');
    assert.equal(partialReturn.daysLate, 0);

    const secondItem = booking.items[1];
    const secondReturn = await recordBookingReturn(shopId, booking.id, null, {
      returnedAt: '2026-10-12T19:00:00Z',
      items: [{ bookingItemId: secondItem.id, inventoryItemId: secondItem.inventoryItemId, condition: 'FAIR', damageStatus: 'MINOR', notes: 'Small stain' }],
    }, audit);
    assert.equal(secondReturn.status, 'PARTIAL');
    assert.equal(secondReturn.returnStatus, 'ON_TIME');

    const thirdItem = booking.items[2];
    const finalReturn = await recordBookingReturn(shopId, booking.id, null, {
      returnedAt: '2026-10-14T18:30:00Z',
      items: [{ bookingItemId: thirdItem.id, inventoryItemId: thirdItem.inventoryItemId, condition: 'DAMAGED', damageStatus: 'LOST' }],
    }, audit);
    assert.equal(finalReturn.status, 'COMPLETED');
    assert.equal(finalReturn.returnStatus, 'LATE');
    assert.equal(finalReturn.daysLate, 2);

    const [bookingRow] = await pool.query('SELECT status, paid_amount, balance_amount, deposit_amount FROM bookings WHERE id = ?', [booking.id]);
    assert.equal(bookingRow[0].status, 'COMPLETED');
    assert.equal(Number(bookingRow[0].deposit_amount), 150);
    assert.equal(Number(bookingRow[0].paid_amount), 0);
    const statuses = await Promise.all(inventory.map(async (item) => {
      const [rows] = await pool.query('SELECT status FROM inventory_items WHERE id = ?', [item.id]);
      return rows[0].status;
    }));
    assert.deepEqual(statuses.sort(), ['INSPECTION', 'INSPECTION', 'LOST']);
    const [updatedConditions] = await pool.query(
      `SELECT id, physical_condition FROM inventory_items WHERE id IN (${inventory.map(() => '?').join(', ')})`,
      inventory.map((item) => item.id),
    );
    const conditionById = new Map(updatedConditions.map((item) => [Number(item.id), item.physical_condition]));
    assert.equal(conditionById.get(Number(inventory[1].id)), 'FAIR');
    assert.equal(conditionById.get(Number(inventory[2].id)), 'DAMAGED');

    const history = await getBookingReturnHistoryForShop(shopId, booking.id);
    assert.equal(history.pagination.totalItems, 3);
    const lateReturns = await listReturnsForShop(shopId, { status: 'LATE', sortBy: 'returnDate', sortOrder: 'desc' });
    assert.equal(lateReturns.pagination.totalItems, 1);
    assert.equal(lateReturns.data[0].returnStatus, 'LATE');
    const itemHistory = await getInventoryReturnHistoryForShop(shopId, inventory[0].id);
    assert.equal(itemHistory.pagination.totalItems, 1);
    assert.equal((await getReturnForShop(shopId, finalReturn.id)).daysLate, 2);
    await assert.rejects(getReturnForShop(shopIds[1], finalReturn.id), (error) => error.code === 'RETURN_NOT_FOUND');
    await assert.rejects(getBookingReturnHistoryForShop(shopIds[1], booking.id), (error) => error.code === 'BOOKING_NOT_FOUND');
    await assert.rejects(getInventoryReturnHistoryForShop(shopIds[1], inventory[0].id), (error) => error.code === 'INVENTORY_ITEM_NOT_FOUND');
  } finally {
    if (shopIds.length) {
      const placeholders = shopIds.map(() => '?').join(', ');
      await pool.query(`DELETE FROM audit_logs WHERE shop_id IN (${placeholders})`, shopIds);
      await pool.query(`DELETE FROM returns WHERE shop_id IN (${placeholders})`, shopIds);
      await pool.query(`DELETE FROM bookings WHERE shop_id IN (${placeholders})`, shopIds);
      await pool.query(`DELETE FROM inventory_items WHERE shop_id IN (${placeholders})`, shopIds);
      await pool.query(`DELETE FROM products WHERE shop_id IN (${placeholders})`, shopIds);
      await pool.query(`DELETE FROM customers WHERE shop_id IN (${placeholders})`, shopIds);
      await pool.query(`DELETE FROM categories WHERE shop_id IN (${placeholders})`, shopIds);
      await pool.query(`DELETE FROM shops WHERE id IN (${placeholders})`, shopIds);
    }
    await pool.end();
  }
});