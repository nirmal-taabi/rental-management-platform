import test from 'node:test';
import assert from 'node:assert/strict';

import { validateCustomerInput, validateCustomerStatusInput } from '../src/validators/customer.validator.js';

test('validateCustomerInput accepts valid payload', () => {
  const result = validateCustomerInput({
    firstName: 'Arun',
    lastName: 'Kumar',
    phone: '9876543210',
    alternatePhone: '',
    email: 'arun@example.com',
    address: '12 Main Street',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    notes: 'Preferred regular customer',
  });

  assert.equal(result.isValid, true);
  assert.equal(result.errors.length, 0);
});

test('validateCustomerInput rejects invalid phone and pincode', () => {
  const result = validateCustomerInput({
    firstName: 'Arun',
    phone: '12345',
    pincode: 'ABC',
    email: 'bad-email',
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === 'phone'));
  assert.ok(result.errors.some((error) => error.field === 'pincode'));
  assert.ok(result.errors.some((error) => error.field === 'email'));
});

test('validateCustomerInput identifies an invalid alternate phone', () => {
  const result = validateCustomerInput({
    firstName: 'Kumaran',
    lastName: 'M',
    phone: '9999999999',
    alternatePhone: '0000000000',
    email: 'kumaran@gmail.com',
    address: 'test address',
    city: 'chennai',
    state: 'Tamil Nadu',
    pincode: '600088',
    notes: 'asdasd',
  });

  assert.equal(result.isValid, false);
  assert.deepEqual(result.errors, [{
    field: 'alternatePhone',
    message: 'Alternate phone must be a valid Indian phone number.',
  }]);
});

test('validateCustomerStatusInput accepts ACTIVE and INACTIVE', () => {
  assert.equal(validateCustomerStatusInput({ status: 'ACTIVE' }).isValid, true);
  assert.equal(validateCustomerStatusInput({ status: 'INACTIVE' }).isValid, true);
  assert.equal(validateCustomerStatusInput({ status: 'PENDING' }).isValid, false);
});
