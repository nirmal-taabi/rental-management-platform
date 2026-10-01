import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/config/database.js';
import {
  createCategoryForShop,
  getCategoriesForShop,
  getCategoryForShop,
  updateCategoryForShop,
  updateCategoryStatusForShop,
} from '../src/services/category.service.js';
import {
  createProductForShop,
  getProductForShop,
  getProductImagePathForShop,
  getProductsForShop,
  updateProductForShop,
  updateProductStatusForShop,
} from '../src/services/product.service.js';
import { deleteProductImages } from '../src/services/imageStorage.service.js';

const enabled = process.env.RUN_DB_INTEGRATION === '1';
const testImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ1sAAAAASUVORK5CYII=', 'base64');

test('catalog CRUD and tenant isolation against PostgreSQL', { skip: !enabled }, async () => {
  const suffix = randomUUID().replace(/-/g, '');
  const shopSlugs = [`catalog-test-a-${suffix}`, `catalog-test-b-${suffix}`];
  const shopIds = [];
  const storedImageUrls = [];

  try {
    for (const [index, slug] of shopSlugs.entries()) {
      const [result] = await pool.query('INSERT INTO shops (name, slug, status) VALUES (?, ?, ?)', [`Catalog Integration ${index}`, slug, 'active']);
      shopIds.push(result.insertId);
    }
    const [shopA, shopB] = shopIds;
    const audit = { userId: null, ipAddress: '127.0.0.1' };

    const categoryA = await createCategoryForShop(shopA, { name: '  Bridal  ' }, audit);
    const categoryB = await createCategoryForShop(shopB, { name: 'Bridal' }, audit);
    await assert.rejects(
      createCategoryForShop(shopA, { name: 'bridal' }, audit),
      (error) => error.code === 'CATEGORY_NAME_EXISTS',
    );
    assert.equal(await getCategoryForShop(shopA, categoryB.id).then(() => false, (error) => error.code === 'CATEGORY_NOT_FOUND'), true);

    const payload = {
      categoryId: categoryA.id,
      name: 'Designer Red Bridal Lehenga',
      sku: 'brl-red-001',
      description: 'Red embroidery',
      rentalPrice: '3500.00',
      depositAmount: '5000.00',
      imageManifest: JSON.stringify(['new:0']),
      primaryImageToken: 'new:0',
    };
    const productA = await createProductForShop(shopA, payload, [{ buffer: testImage, mimetype: 'image/png' }], audit);
    storedImageUrls.push(...productA.images.map((image) => image.imageUrl));
    const productB = await createProductForShop(shopB, { ...payload, categoryId: categoryB.id, imageManifest: undefined, primaryImageToken: undefined }, [], audit);
    assert.equal(productA.sku, 'BRL-RED-001');
    assert.equal(productA.images.length, 1);
    assert.equal(productA.images[0].isPrimary, true);
    assert.equal(productB.sku, productA.sku, 'same SKU is allowed in separate shops');
    const imageFilename = productA.images[0].imageUrl.split('/').at(-1);
    await assert.rejects(getProductImagePathForShop(shopB, shopA, imageFilename), (error) => error.code === 'PRODUCT_IMAGE_NOT_FOUND');
    assert.ok((await getProductImagePathForShop(shopA, shopA, imageFilename)).endsWith(imageFilename));

    assert.equal((await getProductForShop(shopA, productA.id)).name, productA.name);
    await assert.rejects(getProductForShop(shopA, productB.id), (error) => error.code === 'PRODUCT_NOT_FOUND');
    await assert.rejects(updateProductForShop(shopA, productB.id, payload, [], audit), (error) => error.code === 'PRODUCT_NOT_FOUND');
    await assert.rejects(updateProductStatusForShop(shopA, productB.id, { status: 'INACTIVE' }, audit), (error) => error.code === 'PRODUCT_NOT_FOUND');
    await assert.rejects(createProductForShop(shopA, { ...payload, sku: 'other-001', categoryId: categoryB.id }, [], audit), (error) => error.code === 'PRODUCT_CATEGORY_MISMATCH');
    await assert.rejects(updateProductForShop(shopA, productA.id, { ...payload, categoryId: categoryB.id }, [], audit), (error) => error.code === 'PRODUCT_CATEGORY_MISMATCH');
    await assert.rejects(createProductForShop(shopA, payload, [], audit), (error) => error.code === 'PRODUCT_SKU_EXISTS');

    const filtered = await getProductsForShop(shopA, { search: 'red', categoryId: categoryA.id, status: 'ACTIVE', page: 1, limit: 1, sortBy: 'created_at' });
    assert.equal(filtered.pagination.totalItems, 1);
    assert.equal(filtered.data[0].id, productA.id);

    const updated = await updateProductForShop(shopA, productA.id, {
      ...payload,
      categoryId: categoryA.id,
      name: 'Designer Red Bridal Lehenga Updated',
      rentalPrice: '0.00',
      imageManifest: JSON.stringify([]),
      primaryImageToken: '',
    }, [], audit);
    assert.equal(updated.rentalPrice, '0.00');
    assert.equal(updated.images.length, 0);
    await updateProductStatusForShop(shopA, productA.id, { status: 'INACTIVE' }, audit);
    assert.equal((await getProductForShop(shopA, productA.id)).status, 'INACTIVE');
    await updateProductStatusForShop(shopA, productA.id, { status: 'ACTIVE' }, audit);
    assert.equal((await getProductForShop(shopA, productA.id)).status, 'ACTIVE');

    await updateCategoryForShop(shopA, categoryA.id, { name: 'Wedding Wear', description: 'Test category' }, audit);
    await updateCategoryStatusForShop(shopA, categoryA.id, { status: 'INACTIVE' }, audit);
    assert.equal((await getCategoriesForShop(shopA, { status: 'ACTIVE' })).data.length, 0);
    assert.equal((await getProductForShop(shopA, productA.id)).categoryName, 'Wedding Wear');
    await updateProductForShop(shopA, productA.id, { categoryId: categoryA.id, name: updated.name, sku: updated.sku, description: updated.description, rentalPrice: '10.00', depositAmount: updated.depositAmount }, [], audit);
    await updateCategoryStatusForShop(shopA, categoryA.id, { status: 'ACTIVE' }, audit);
    assert.equal((await getCategoryForShop(shopA, categoryA.id)).status, 'ACTIVE');
  } finally {
    await deleteProductImages(storedImageUrls);
    if (shopIds.length) {
      const placeholders = shopIds.map(() => '?').join(', ');
      await pool.query(`DELETE FROM shops WHERE id IN (${placeholders})`, shopIds);
    }
    await pool.end();
  }
});