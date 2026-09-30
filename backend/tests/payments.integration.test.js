import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/config/database.js';
import { createInventoryItemForShop } from '../src/services/inventory.service.js';
import { createBookingForShop } from '../src/services/booking.service.js';
import {
  cancelPaymentForShop,
  createPaymentForShop,
  getBookingPaymentHistoryForShop,
  getCustomerPaymentHistoryForShop,
  getPaymentForShop,
  getPaymentSummaryForShop,
} from '../src/services/payment.service.js';
import { getBookingPaymentSummary } from '../src/services/paymentCalculation.service.js';

const enabled = process.env.RUN_DB_INTEGRATION === '1';

test('payment ledger supports partial payments, cancellation, histories, and concurrent overpayment protection', { skip: !enabled }, async () => {
  const suffix = randomUUID().replace(/-/g, '');
  let shopId;
  try {
    const [shopResult] = await pool.query(
      'INSERT INTO shops (name, slug, status) VALUES (?, ?, ?)',
      [`Payment Integration ${suffix}`, `payment-test-${suffix}`, 'active'],
    );
    shopId = shopResult.insertId;
    const [categoryResult] = await pool.query(
      "INSERT INTO categories (shop_id, name, slug, status) VALUES (?, ?, ?, 'active')",
      [shopId, `Payment Test ${suffix}`, `payment-category-${suffix}`],
    );
    const [productResult] = await pool.query(
      `INSERT INTO products (shop_id, category_id, sku, name, slug, product_type, daily_rental_rate, security_deposit, status)
       VALUES (?, ?, ?, ?, ?, 'garment', 100.00, 50.00, 'active')`,
      [shopId, categoryResult.insertId, `PAY-${suffix.slice(0, 12)}`, 'Payment Integration Product', `payment-product-${suffix}`],
    );
    const [customerResult] = await pool.query(
      "INSERT INTO customers (shop_id, first_name, phone, status) VALUES (?, 'Payment Customer', ?, 'active')",
      [shopId, `8${suffix.slice(0, 9)}`],
    );
    const item = await createInventoryItemForShop(shopId, {
      productId: productResult.insertId,
      sku: `PAY-ITEM-${suffix.slice(0, 12)}`,
    }, { userId: null, ipAddress: '127.0.0.1' });
    const audit = { userId: null, ipAddress: '127.0.0.1' };
    const booking = await createBookingForShop(shopId, null, {
      customerId: customerResult.insertId,
      rentalStartDate: '2026-10-20',
      rentalEndDate: '2026-10-20',
      items: [{ productId: productResult.insertId, inventoryItemId: item.id }],
    }, audit);

    const first = await createPaymentForShop(shopId, null, {
      bookingId: booking.id, amount: '75.00', paymentType: 'DEPOSIT', paymentMethod: 'UPI', transactionDate: '2026-09-29',
    }, audit);
    assert.match(first.paymentReference, /^PAY-2026-\d{5,}$/);
    assert.equal(first.status, 'SUCCESS');
    assert.equal(first.bookingPaymentSummary.paymentStatus, 'PARTIALLY_PAID');
    assert.equal(first.bookingPaymentSummary.balanceAmount, '75.00');

    const second = await createPaymentForShop(shopId, null, {
      bookingId: booking.id, amount: '50.00', paymentType: 'RENTAL', paymentMethod: 'CASH', transactionDate: '2026-09-29',
    }, audit);
    assert.equal(second.bookingPaymentSummary.netPaid, '125.00');
    assert.equal(second.bookingPaymentSummary.balanceAmount, '25.00');
    await assert.rejects(createPaymentForShop(shopId, null, {
      bookingId: booking.id, amount: '25.01', paymentType: 'RENTAL', paymentMethod: 'CASH', transactionDate: '2026-09-29',
    }, audit), (error) => error.code === 'PAYMENT_AMOUNT_EXCEEDS_BALANCE');

    const third = await createPaymentForShop(shopId, null, {
      bookingId: booking.id, amount: '25.00', paymentType: 'RENTAL', paymentMethod: 'CARD', transactionDate: '2026-09-29',
    }, audit);
    assert.equal(third.bookingPaymentSummary.paymentStatus, 'PAID');
    await cancelPaymentForShop(shopId, second.id, null, { reason: 'Duplicate test receipt' }, audit);
    let summary = await getBookingPaymentSummary(shopId, booking.id);
    assert.equal(summary.netPaid, '100.00');
    assert.equal(summary.balanceAmount, '50.00');

    const competing = await Promise.allSettled([
      createPaymentForShop(shopId, null, {
        bookingId: booking.id, amount: '50.00', paymentType: 'RENTAL', paymentMethod: 'UPI', transactionDate: '2026-09-29',
      }, audit),
      createPaymentForShop(shopId, null, {
        bookingId: booking.id, amount: '50.00', paymentType: 'RENTAL', paymentMethod: 'UPI', transactionDate: '2026-09-29',
      }, audit),
    ]);
    assert.equal(competing.filter((result) => result.status === 'fulfilled').length, 1);
    const rejected = competing.find((result) => result.status === 'rejected');
    assert.equal(rejected.reason.code, 'PAYMENT_AMOUNT_EXCEEDS_BALANCE');
    summary = await getBookingPaymentSummary(shopId, booking.id);
    assert.equal(summary.netPaid, '150.00');
    assert.equal(summary.balanceAmount, '0.00');

    const history = await getBookingPaymentHistoryForShop(shopId, booking.id);
    assert.equal(history.pagination.totalItems, 4);
    const customerHistory = await getCustomerPaymentHistoryForShop(shopId, customerResult.insertId);
    assert.equal(customerHistory.summary.totalBookings, 1);
    const details = await getPaymentForShop(shopId, first.id);
    assert.equal(details.customer.id, customerResult.insertId);
    const list = await getPaymentSummaryForShop(shopId, { startDate: '2026-09-29', endDate: '2026-09-29' });
    assert.equal(list.totalCollected, '150.00');
    assert.equal(list.totalRefunded, '0.00');
  } finally {
    if (shopId) {
      await pool.query('DELETE FROM audit_logs WHERE shop_id = ?', [shopId]);
      await pool.query('DELETE FROM payments WHERE shop_id = ?', [shopId]);
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