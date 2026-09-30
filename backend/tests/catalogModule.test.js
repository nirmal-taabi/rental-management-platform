import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCategoryInput, validateProductInput, validateProductStatus } from '../src/validators/catalog.validator.js';
import AppError from '../src/utils/AppError.js';
import errorHandler from '../src/middlewares/errorHandler.js';
import { findCategoryById } from '../src/repositories/category.repository.js';
import { findProductById, findProductsByShop } from '../src/repositories/product.repository.js';
import { authorizeRoles } from '../src/middlewares/authorization.middleware.js';
import { storeProductImages } from '../src/services/imageStorage.service.js';

test('category validation trims names and rejects empty or oversized data', () => {
  assert.equal(validateCategoryInput({ name: '  Bridal  ' }).isValid, true);
  assert.equal(validateCategoryInput({ name: '   ' }).isValid, false);
  assert.equal(validateCategoryInput({ name: 'Valid', description: 'x'.repeat(501) }).isValid, false);
});

test('product validation accepts decimal strings and rejects invalid pricing and SKU', () => {
  const valid = validateProductInput({ categoryId: '12', name: ' Red Bridal Lehenga ', sku: 'brl-red-001', rentalPrice: '3500.50', depositAmount: '0' });
  assert.equal(valid.isValid, true);

  const invalid = validateProductInput({ categoryId: 'nope', name: '', sku: 'bad sku', rentalPrice: '-1', depositAmount: '1.999' });
  assert.equal(invalid.isValid, false);
  assert.deepEqual(new Set(invalid.errors.map((error) => error.field)), new Set(['categoryId', 'name', 'sku', 'rentalPrice', 'depositAmount']));
});

test('product status only accepts ACTIVE and INACTIVE', () => {
  assert.equal(validateProductStatus({ status: 'ACTIVE' }).isValid, true);
  assert.equal(validateProductStatus({ status: 'INACTIVE' }).isValid, true);
  assert.equal(validateProductStatus({ status: 'DRAFT' }).isValid, false);
});

test('category lookup hides another shop category by id', async () => {
  let capturedQuery = '';
  let capturedValues = [];
  const connection = {
    query: async (query, values) => {
      capturedQuery = query;
      capturedValues = values;
      const [categoryId, shopId] = values;
      return [categoryId === 22 && shopId === 2 ? [{ id: 22, shop_id: 2, name: 'Shop B' }] : []];
    },
  };

  const result = await findCategoryById(1, 22, connection);
  assert.equal(result, null);
  assert.match(capturedQuery, /id = \? AND shop_id = \?/);
  assert.deepEqual(capturedValues, [22, 1]);
});

test('product lookup hides another shop product by id', async () => {
  let capturedQuery = '';
  let capturedValues = [];
  const connection = {
    query: async (query, values) => {
      capturedQuery = query;
      capturedValues = values;
      return [[]];
    },
  };

  const result = await findProductById(1, 42, connection);
  assert.equal(result, null);
  assert.match(capturedQuery, /p\.id = \? AND p\.shop_id = \?/);
  assert.deepEqual(capturedValues, [42, 1]);
});

test('product list combines tenant, search, category, status, sort, and pagination filters', async () => {
  let capturedQuery = '';
  let capturedValues = [];
  const connection = {
    query: async (query, values) => {
      if (query.includes('information_schema.statistics')) return [[{ total: 1 }]];
      capturedQuery = query;
      capturedValues = values;
      return [[]];
    },
  };

  const result = await findProductsByShop(7, {
    search: 'red', categoryId: 12, status: 'ACTIVE', page: 2, limit: 20, sortBy: 'created_at', sortOrder: 'desc',
  }, connection);

  assert.deepEqual(result, []);
  assert.match(capturedQuery, /p\.shop_id = \?/);
  assert.match(capturedQuery, /p\.category_id = \?/);
  assert.match(capturedQuery, /p\.status = \?/);
  assert.match(capturedQuery, /MATCH\(p\.name, p\.sku, p\.description\) AGAINST/);
  assert.match(capturedQuery, /p\.name LIKE \? OR p\.sku LIKE \? OR p\.description LIKE \?/);
  assert.match(capturedQuery, /ORDER BY p\.created_at DESC/);
  assert.deepEqual(capturedValues, [7, 'active', 12, 'red', '%red%', '%red%', '%red%', 20, 20]);
});

test('role middleware allows owners/admins and denies staff from manage-only routes', () => {
  const runGuard = (roles) => {
    let forwardedError = null;
    const middleware = authorizeRoles('OWNER', 'ADMIN');
    middleware({ user: { roles } }, {}, (error) => { forwardedError = error || null; });
    return forwardedError;
  };

  assert.equal(runGuard(['OWNER']), null);
  assert.equal(runGuard(['ADMIN']), null);
  assert.equal(runGuard(['STAFF']).statusCode, 403);
});

test('image storage rejects data without an allowed image signature', async () => {
  await assert.rejects(
    storeProductImages(1, [{ buffer: Buffer.from('not an image'), mimetype: 'image/png' }]),
    (error) => error.code === 'INVALID_PRODUCT_IMAGE',
  );
});

test('central error handler preserves catalog codes and validation details', () => {
  const response = {
    statusCode: null,
    body: null,
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; },
  };
  const error = new AppError('Category mismatch.', 400, 'PRODUCT_CATEGORY_MISMATCH', true, [{ field: 'categoryId', message: 'Unavailable category.' }]);
  errorHandler(error, { method: 'POST', originalUrl: '/api/v1/products', ip: '127.0.0.1' }, response, () => {});

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error.code, 'PRODUCT_CATEGORY_MISMATCH');
  assert.deepEqual(response.body.error.details, [{ field: 'categoryId', message: 'Unavailable category.' }]);
});