import test from 'node:test';
import assert from 'node:assert/strict';
import { getReturnStatus } from '../src/services/returnDate.service.js';
import { validatePickupInput, validateReturnInput } from '../src/validators/return.validator.js';

test('return date service classifies inclusive expected return dates and late days', () => {
  assert.deepEqual(getReturnStatus('2026-10-12', '2026-10-12T18:30:00Z'), {
    expectedReturnDate: '2026-10-12', actualReturnDate: '2026-10-12T18:30:00.000Z', returnStatus: 'ON_TIME', daysLate: 0,
  });
  assert.equal(getReturnStatus('2026-10-12', '2026-10-14T18:30:00Z').daysLate, 2);
  assert.equal(getReturnStatus('2026-10-12', '2026-10-14T18:30:00Z').returnStatus, 'LATE');
  assert.throws(() => getReturnStatus('2026-02-30', '2026-03-01T00:00:00Z'), TypeError);
});

test('pickup and return validators require unique linked items and controlled condition values', () => {
  assert.deepEqual(validatePickupInput({ items: [{ bookingItemId: 1, inventoryItemId: 2 }] }), []);
  assert.ok(validatePickupInput({ items: [{ bookingItemId: 1, inventoryItemId: 2 }, { bookingItemId: 1, inventoryItemId: 2 }] }).length > 0);
  assert.deepEqual(validateReturnInput({
    returnedAt: '2026-10-12T18:30:00Z',
    items: [{ bookingItemId: 1, inventoryItemId: 2, condition: 'GOOD', damageStatus: 'NONE' }],
  }), []);
  assert.ok(validateReturnInput({
    returnedAt: '2026-10-12T18:30:00Z',
    items: [{ bookingItemId: 1, inventoryItemId: 2, condition: 'NEW', damageStatus: 'UNKNOWN' }],
  }).length >= 2);
});