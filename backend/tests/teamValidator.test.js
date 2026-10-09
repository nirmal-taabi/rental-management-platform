import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePasswordChangeInput,
  validateStaffCreateInput,
  validateStaffStatusInput,
} from '../src/validators/team.validator.js';

test('staff creation normalizes email and accepts valid staff details', () => {
  const result = validateStaffCreateInput({
    firstName: 'Ravi',
    lastName: 'Kumar',
    email: 'RAVI@example.com',
    phone: '9876543210',
    temporaryPassword: 'TempPass@123',
  });

  assert.equal(result.isValid, true);
  assert.equal(result.value.email, 'ravi@example.com');
});

test('staff creation rejects weak temporary passwords and malformed email', () => {
  const result = validateStaffCreateInput({
    firstName: 'Ravi',
    email: 'not-an-email',
    temporaryPassword: 'weak',
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === 'email'));
  assert.ok(result.errors.some((error) => error.field === 'temporaryPassword'));
});

test('staff access status accepts only active and suspended', () => {
  assert.equal(validateStaffStatusInput({ status: 'suspended' }).isValid, true);
  assert.equal(validateStaffStatusInput({ status: 'removed' }).isValid, false);
});

test('first-login password change rejects reusing the temporary password', () => {
  const result = validatePasswordChangeInput({
    currentPassword: 'TempPass@123',
    newPassword: 'TempPass@123',
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === 'newPassword'));
});
