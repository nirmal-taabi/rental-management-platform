import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateForgotPasswordInput,
  validateRegisterInput,
  validateResetPasswordInput,
} from '../src/validators/auth.validator.js';
import { validateShopUpdateInput } from '../src/validators/shop.validator.js';
import { parseAuthToken, signToken } from '../src/utils/jwt.js';

test('validateRegisterInput accepts valid payload', () => {
  const result = validateRegisterInput({
    owner: {
      firstName: 'Amit',
      lastName: 'Sharma',
      email: 'amit@example.com',
      phone: '9876543210',
      password: 'Password@123',
      confirmPassword: 'Password@123',
    },
    shop: {
      name: 'Amit Rentals',
      businessName: 'Amit Rentals',
      phone: '9876543210',
      email: 'shop@example.com',
      address: 'Main Road',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      gstNumber: '07ABCDE1234F1Z5',
    },
  });

  assert.equal(result.isValid, true);
  assert.equal(result.errors.length, 0);
});

test('validateRegisterInput rejects invalid email', () => {
  const result = validateRegisterInput({
    owner: {
      firstName: 'Amit',
      lastName: 'Sharma',
      email: 'not-an-email',
      phone: '9876543210',
      password: 'Password@123',
      confirmPassword: 'Password@123',
    },
    shop: {
      name: 'Amit Rentals',
      businessName: 'Amit Rentals',
      phone: '9876543210',
      email: 'shop@example.com',
      address: 'Main Road',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
    },
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === 'owner.email'));
});

test('password recovery validators accept valid input and enforce reset requirements', () => {
  assert.equal(validateForgotPasswordInput({ email: 'person@example.com' }).isValid, true);
  assert.equal(validateForgotPasswordInput({ email: 'not-an-email' }).isValid, false);

  assert.equal(validateResetPasswordInput({
    token: 'a'.repeat(64),
    newPassword: 'Password@123',
    confirmPassword: 'Password@123',
  }).isValid, true);
  assert.equal(validateResetPasswordInput({
    token: 'invalid',
    newPassword: 'Password@123',
    confirmPassword: 'Different@123',
  }).isValid, false);
});

test('validateResetPasswordInput rejects passwords exceeding bcrypt byte limit', () => {
  const result = validateResetPasswordInput({
    token: 'a'.repeat(64),
    newPassword: 'Ä'.repeat(37) + 'Aa1!',
    confirmPassword: 'Ä'.repeat(37) + 'Aa1!',
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === 'newPassword' && error.message.includes('72 bytes')));
});

test('validateShopUpdateInput rejects invalid pincode', () => {
  const result = validateShopUpdateInput({
    name: 'Amit Rentals',
    businessName: 'Amit Rentals',
    phone: '9876543210',
    email: 'shop@example.com',
    address: 'Main Road',
    city: 'Delhi',
    state: 'Delhi',
    pincode: 'ABC',
    gstNumber: '07ABCDE1234F1Z5',
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === 'pincode'));
});

test('signToken and parseAuthToken round-trip values', () => {
  const token = signToken({ id: 10, shopId: 3, roles: ['OWNER'] });
  const payload = parseAuthToken(token);

  assert.equal(payload.id, 10);
  assert.equal(payload.shopId, 3);
  assert.deepEqual(payload.roles, ['OWNER']);
});
