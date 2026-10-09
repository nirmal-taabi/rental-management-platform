import test from 'node:test';
import assert from 'node:assert/strict';

import { authorizeRoles } from '../src/middlewares/authorization.middleware.js';
import { getPlatformShops, getPlatformUsers } from '../src/services/admin.service.js';

const authorize = (roles, platformRoles, allowedRole) => {
  let passed = false;
  let error;
  authorizeRoles(allowedRole)(
    { user: { roles, platformRoles } },
    {},
    (nextError) => {
      error = nextError;
      passed = !nextError;
    },
  );
  return { passed, error };
};

test('platform admin authorization accepts database-resolved platform role', () => {
  const result = authorize(['OWNER'], ['SUPER_ADMIN'], 'SUPER_ADMIN');
  assert.equal(result.passed, true);
  assert.equal(result.error, undefined);
});

test('shop membership role cannot grant platform admin authorization', () => {
  const result = authorize(['SUPER_ADMIN'], [], 'SUPER_ADMIN');
  assert.equal(result.passed, false);
  assert.equal(result.error.statusCode, 403);
});

test('shop role authorization continues using shop membership roles', () => {
  const result = authorize(['MANAGER'], ['SUPER_ADMIN'], 'MANAGER');
  assert.equal(result.passed, true);
  assert.equal(result.error, undefined);
});

test('platform shop list rejects unsafe sort fields before querying', () => {
  assert.throws(
    () => getPlatformShops({ sortBy: 'createdAt; DROP TABLE shops' }),
    (error) => error.code === 'VALIDATION_ERROR' && error.statusCode === 400,
  );
});

test('platform account list rejects unsupported role filters before querying', () => {
  assert.throws(
    () => getPlatformUsers({ role: 'INJECTED_ROLE' }),
    (error) => error.code === 'VALIDATION_ERROR' && error.statusCode === 400,
  );
});
