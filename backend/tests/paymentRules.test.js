import test from 'node:test';
import assert from 'node:assert/strict';
import { PAYMENT_METHODS, PAYMENT_STATUS_TRANSITIONS, PAYMENT_TYPES } from '../src/constants/payment.constants.js';
import { summarizeBookingPayments } from '../src/services/paymentCalculation.service.js';
import { toCents } from '../src/utils/paymentMoney.js';
import { validateCancelPayment, validateCreatePayment, validatePaymentListQuery } from '../src/validators/payment.validator.js';

test('payment money parsing uses exact cents and rejects unsafe inputs', () => {
  assert.equal(toCents('5000'), 500000);
  assert.equal(toCents('5000.25'), 500025);
  assert.equal(toCents('-1'), null);
  assert.equal(toCents('1.001'), null);
});

test('booking payment summary separates rental, deposit, paid, refund, and balance', () => {
  const summary = summarizeBookingPayments(
    { total_amount: '8000.00', deposit_amount: '10000.00' },
    { net_paid: '13000.00', refunded: '0.00' },
  );
  assert.deepEqual(summary, {
    rentalAmount: '8000.00', depositAmount: '10000.00', bookingTotal: '18000.00',
    totalPaid: '13000.00', refundedAmount: '0.00', netPaid: '13000.00',
    balanceAmount: '5000.00', paymentStatus: 'PARTIALLY_PAID',
  });
  assert.equal(summarizeBookingPayments({ total_amount: '100', deposit_amount: '0' }, { net_paid: '0', refunded: '0' }).paymentStatus, 'UNPAID');
  assert.equal(summarizeBookingPayments({ total_amount: '100', deposit_amount: '0' }, { net_paid: '100', refunded: '0' }).paymentStatus, 'PAID');
  assert.equal(summarizeBookingPayments({ total_amount: '100', deposit_amount: '0' }, { net_paid: '101', refunded: '0' }).paymentStatus, 'OVERPAID');
});

test('payment validation enforces booking, amount, type, method, and business date', () => {
  const valid = validateCreatePayment({ bookingId: 1, amount: '0.01', paymentType: 'RENTAL', paymentMethod: 'UPI', transactionDate: '2026-09-29' });
  assert.deepEqual(valid, []);
  assert.ok(validateCreatePayment({ bookingId: 1, amount: '0', paymentType: 'UNKNOWN', paymentMethod: 'WIRE', transactionDate: '2026-02-30' }).length >= 4);
  assert.deepEqual(validateCancelPayment({ reason: 'Duplicate entry' }), []);
  assert.ok(validateCancelPayment({ reason: 'x' }).length > 0);
  assert.deepEqual(validatePaymentListQuery({ status: 'SUCCESS', paymentMethod: 'CASH', paymentType: 'DEPOSIT' }), []);
});

test('payment methods, types, and pending transitions remain controlled', () => {
  assert.deepEqual(PAYMENT_METHODS, ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'OTHER']);
  assert.ok(PAYMENT_TYPES.includes('DEPOSIT'));
  assert.deepEqual(PAYMENT_STATUS_TRANSITIONS.PENDING, ['SUCCESS', 'FAILED', 'CANCELLED']);
  assert.deepEqual(PAYMENT_STATUS_TRANSITIONS.SUCCESS, []);
});