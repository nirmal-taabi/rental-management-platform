import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeRoles } from '../src/middlewares/authorization.middleware.js';
import { findInventoryItemById, findInventoryItemsByShop } from '../src/repositories/inventory.repository.js';
import { canTransitionInventoryStatus, getAllowedInventoryTransitions } from '../src/services/inventoryStatus.service.js';
import { validateInventoryCondition, validateInventoryInput, validateInventoryStatus } from '../src/validators/inventory.validator.js';

test('inventory validation accepts an item with defaults and rejects invalid identifiers and dates', () => {
  const valid = validateInventoryInput({ productId: 1, sku: 'BRL-RED-001-01', condition: 'GOOD', purchaseDate: '2026-09-28' });
  assert.equal(valid.isValid, true);

  const invalid = validateInventoryInput({ productId: 'x', sku: 'bad sku', condition: 'NEW', purchaseDate: '2026-02-30' });
  assert.equal(invalid.isValid, false);
  assert.deepEqual(new Set(invalid.errors.map((error) => error.field)), new Set(['productId', 'sku', 'condition', 'purchaseDate']));
});

test('inventory status and condition only accept the controlled values', () => {
  assert.equal(validateInventoryStatus({ status: 'CLEANING' }).isValid, true);
  assert.equal(validateInventoryStatus({ status: 'BOOKED' }).isValid, false);
  assert.equal(validateInventoryCondition({ condition: 'FAIR' }).isValid, true);
  assert.equal(validateInventoryCondition({ condition: 'NEW' }).isValid, false);
});

test('inventory transitions allow maintenance flow and prevent casual lost/retired recovery', () => {
  assert.equal(canTransitionInventoryStatus('AVAILABLE', 'CLEANING'), true);
  assert.equal(canTransitionInventoryStatus('RENTED', 'INSPECTION'), true);
  assert.equal(canTransitionInventoryStatus('CLEANING', 'AVAILABLE'), true);
  assert.equal(canTransitionInventoryStatus('LOST', 'AVAILABLE'), false);
  assert.equal(canTransitionInventoryStatus('RETIRED', 'AVAILABLE'), false);
  assert.deepEqual(getAllowedInventoryTransitions('UNKNOWN'), []);
});

test('inventory detail lookup is scoped by item id and authenticated shop', async () => {
  let capturedQuery = '';
  let capturedValues = [];
  const connection = {
    query: async (query, values) => {
      capturedQuery = query;
      capturedValues = values;
      return [[]];
    },
  };

  const result = await findInventoryItemById(1, 42, connection);
  assert.equal(result, null);
  assert.match(capturedQuery, /i\.id = \? AND i\.shop_id = \?/);
  assert.match(capturedQuery, /p\.shop_id = i\.shop_id/);
  assert.deepEqual(capturedValues, [42, 1]);
});

test('inventory listing combines tenant and filter predicates with server-side sorting and pagination', async () => {
  let capturedQuery = '';
  let capturedValues = [];
  const connection = {
    query: async (query, values) => {
      capturedQuery = query;
      capturedValues = values;
      return [[]];
    },
  };

  const rows = await findInventoryItemsByShop(7, {
    search: 'red', status: 'AVAILABLE', condition: 'GOOD', productId: 2, categoryId: 3,
    size: 'M', color: 'Red', page: 2, limit: 20, sortBy: 'sku', sortOrder: 'asc',
  }, connection);

  assert.deepEqual(rows, []);
  assert.match(capturedQuery, /i\.shop_id = \?/);
  assert.match(capturedQuery, /i\.product_id = \?/);
  assert.match(capturedQuery, /p\.category_id = \?/);
  assert.match(capturedQuery, /i\.status = \?/);
  assert.match(capturedQuery, /i\.physical_condition = \?/);
  assert.match(capturedQuery, /ORDER BY i\.item_code ASC/);
  assert.deepEqual(capturedValues, [7, 'AVAILABLE', 'GOOD', 2, 3, 'M', 'Red', '%red%', '%red%', '%red%', '%red%', '%red%', 20, 20]);
});

test('inventory manage routes allow owners/admins and forbid staff', () => {
  const resultFor = (roles) => {
    let error = null;
    authorizeRoles('OWNER', 'ADMIN')({ user: { roles } }, {}, (nextError) => { error = nextError || null; });
    return error;
  };
  assert.equal(resultFor(['OWNER']), null);
  assert.equal(resultFor(['ADMIN']), null);
  assert.equal(resultFor(['STAFF']).statusCode, 403);
});