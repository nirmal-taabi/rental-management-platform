import test from 'node:test';
import assert from 'node:assert/strict';
import { canManuallyTransitionBookingStatus, canTransitionBookingStatus, getAllowedBookingTransitions } from '../src/services/bookingStatus.service.js';
import { calculateBookingPricing } from '../src/services/bookingPricing.service.js';
import { validateBookingInput, validateBulkAvailability, validateInventoryAvailability } from '../src/validators/booking.validator.js';
import {
  dateRangesOverlap,
  getAvailabilitySearchRange,
  getBlockedDateRange,
  isBusinessDate,
  isValidRentalRange,
  rentalDayCount,
} from '../src/utils/availabilityDate.js';

test('rental dates are business dates and end dates are inclusive', () => {
  assert.equal(isBusinessDate('2026-10-10'), true);
  assert.equal(isBusinessDate('2026-02-30'), false);
  assert.equal(isValidRentalRange('2026-10-10', '2026-10-12'), true);
  assert.equal(isValidRentalRange('2026-10-12', '2026-10-10'), false);
  assert.equal(rentalDayCount('2026-10-10', '2026-10-12'), 3);
});

test('availability buffers block inclusive boundary dates', () => {
  const existing = getBlockedDateRange('2026-10-10', '2026-10-12');
  assert.deepEqual(existing, { startDate: '2026-10-10', endDate: '2026-10-13' });
  assert.equal(dateRangesOverlap(existing, getBlockedDateRange('2026-10-13', '2026-10-15')), true);
  assert.equal(dateRangesOverlap(existing, getBlockedDateRange('2026-10-14', '2026-10-16')), false);
  assert.deepEqual(getAvailabilitySearchRange('2026-10-10', '2026-10-12'), { startDate: '2026-10-09', endDate: '2026-10-13' });
});

test('booking status transitions permit forward progress and cancellation only before active', () => {
  assert.equal(canTransitionBookingStatus('PENDING', 'CONFIRMED'), true);
  assert.equal(canTransitionBookingStatus('CONFIRMED', 'CANCELLED'), true);
  assert.equal(canTransitionBookingStatus('ACTIVE', 'CANCELLED'), false);
  assert.equal(canTransitionBookingStatus('COMPLETED', 'CONFIRMED'), false);
  assert.deepEqual(getAllowedBookingTransitions('CANCELLED'), []);
});

test('only the return workflow may complete an active booking', () => {
  assert.equal(canTransitionBookingStatus('ACTIVE', 'COMPLETED'), true);
  assert.equal(canManuallyTransitionBookingStatus('ACTIVE', 'COMPLETED'), false);
  assert.equal(canManuallyTransitionBookingStatus('PENDING', 'CONFIRMED'), true);
});

test('booking pricing uses inclusive daily rates and exact cents', () => {
  const result = calculateBookingPricing({
    rentalStartDate: '2026-10-10',
    rentalEndDate: '2026-10-12',
    discountAmount: '500.00',
    taxAmount: '0',
    items: [{ dailyRentalRate: '3500.00', securityDeposit: '5000.00', discountAmount: '0', taxAmount: '0' }],
  });
  assert.equal(result.rentalDays, 3);
  assert.equal(result.subtotal, '10500.00');
  assert.equal(result.totalAmount, '10000.00');
  assert.equal(result.depositAmount, '5000.00');
  assert.equal(result.balanceAmount, '15000.00');
});

test('booking pricing rejects discounts above subtotal and malformed money', () => {
  assert.throws(() => calculateBookingPricing({
    rentalStartDate: '2026-10-10', rentalEndDate: '2026-10-10', discountAmount: '11',
    items: [{ dailyRentalRate: '10', securityDeposit: '0' }],
  }), { code: 'VALIDATION_ERROR' });
  assert.throws(() => calculateBookingPricing({
    rentalStartDate: '2026-10-10', rentalEndDate: '2026-10-10',
    items: [{ dailyRentalRate: '1.999', securityDeposit: '0' }],
  }), { code: 'VALIDATION_ERROR' });
});

test('booking validation requires unique physical pieces and valid date ranges', () => {
  const valid = validateBookingInput({
    customerId: 1,
    rentalStartDate: '2026-10-10',
    rentalEndDate: '2026-10-12',
    items: [{ productId: 2, inventoryItemId: 3 }],
  });
  assert.deepEqual(valid, []);
  const duplicate = validateBookingInput({
    customerId: 1,
    rentalStartDate: '2026-10-12',
    rentalEndDate: '2026-10-10',
    items: [{ productId: 2, inventoryItemId: 3 }, { productId: 2, inventoryItemId: 3 }],
  });
  assert.equal(duplicate.some((error) => error.field === 'rentalDates'), true);
  assert.equal(duplicate.some((error) => error.message.includes('only be selected once')), true);
  assert.equal(validateBulkAvailability({ inventoryItemIds: [1, 2], startDate: '2026-10-10', endDate: '2026-10-10' }).length, 0);
});

test('inventory availability browsing validates date ranges and filters', () => {
  assert.deepEqual(validateInventoryAvailability({
    startDate: '2026-10-10',
    endDate: '2026-10-12',
    page: '1',
    limit: '50',
    categoryId: '2',
    search: 'Ruby',
    size: 'M',
    color: 'Red',
  }), []);
  const errors = validateInventoryAvailability({
    startDate: '2026-10-12',
    endDate: '2026-10-10',
    page: '0',
    limit: '101',
    size: 'x'.repeat(51),
  });
  assert.equal(errors.some((error) => error.field === 'dateRange'), true);
  assert.equal(errors.some((error) => error.field === 'page'), true);
  assert.equal(errors.some((error) => error.field === 'limit'), true);
  assert.equal(errors.some((error) => error.field === 'size'), true);
});