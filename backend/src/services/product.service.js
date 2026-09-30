import AppError from '../utils/AppError.js';
import { createHash } from 'node:crypto';
import { BAD_REQUEST, CONFLICT, NOT_FOUND } from '../constants/httpStatus.js';
import { findCategoryById } from '../repositories/category.repository.js';
import {
  countProductsByShop,
  createProductRecord,
  findHighestProductSkuSequence,
  findProductById,
  findProductImageForShop,
  findProductBySku,
  findProductsByShop,
  updateProductRecord,
  updateProductStatusRecord,
} from '../repositories/product.repository.js';
import { deleteProductImages, resolveProductImagePath, storeProductImages } from './imageStorage.service.js';
import { validateProductInput, validateProductStatus } from '../validators/catalog.validator.js';
import logger from '../utils/logger.js';

const normalizeProduct = (payload = {}) => ({
  categoryId: Number(payload.categoryId),
  name: String(payload.name || '').trim(),
  sku: String(payload.sku || '').trim().toUpperCase(),
  brand: String(payload.brand || '').trim(),
  productType: String(payload.productType || 'GARMENT').trim().toUpperCase(),
  description: String(payload.description || '').trim(),
  rentalPrice: String(payload.rentalPrice ?? '').trim(),
  depositAmount: String(payload.depositAmount ?? '0').trim(),
});

const slugifyProduct = (name, sku) => {
  const nameSlug = String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
  const skuHash = createHash('sha256').update(String(sku)).digest('hex').slice(0, 24);
  return `${nameSlug || 'product'}-${skuHash}`.slice(0, 180);
};

const validationErrors = (payload) => {
  const validation = validateProductInput(payload);
  if (!validation.isValid) {
    throw new AppError('Invalid product data.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
  }
};

const parseManifest = (value) => {
  if (value === undefined) return null;
  try {
    const manifest = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(manifest) || manifest.length > 8 || manifest.some((token) => typeof token !== 'string')) {
      throw new Error('Invalid manifest');
    }
    if (new Set(manifest).size !== manifest.length) throw new Error('Duplicate image token');
    return manifest;
  } catch {
    throw new AppError('Product image order is invalid.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field: 'images', message: 'Image manifest must be a list of unique image tokens.' }]);
  }
};

const buildImagePlan = (manifest, files, storedUrls, existingImages = [], primaryToken) => {
  const tokens = manifest || [
    ...existingImages.map((image) => `existing:${image.id}`),
    ...files.map((_file, index) => `new:${index}`),
  ];

  const referencedFiles = new Set();
  const plan = tokens.map((token, sortOrder) => {
    if (token.startsWith('existing:')) {
      const id = Number(token.slice('existing:'.length));
      const image = existingImages.find((entry) => Number(entry.id) === id);
      if (!image) {
        throw new AppError('An image does not belong to this product.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field: 'images', message: 'Remove invalid image references and retry.' }]);
      }
      return { id: image.id, imageUrl: image.imageUrl, isPrimary: image.isPrimary, token, sortOrder };
    }
    const match = token.match(/^new:(\d+)$/);
    const fileIndex = match ? Number(match[1]) : -1;
    if (fileIndex < 0 || fileIndex >= storedUrls.length || referencedFiles.has(fileIndex)) {
      throw new AppError('Product image order is invalid.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field: 'images', message: 'Image manifest references an invalid upload.' }]);
    }
    referencedFiles.add(fileIndex);
    return { imageUrl: storedUrls[fileIndex], token, sortOrder };
  });
  if (referencedFiles.size !== storedUrls.length) {
    throw new AppError('Product image order is invalid.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field: 'images', message: 'Every uploaded image must appear in the image manifest.' }]);
  }
  if (plan.length > 8) {
    throw new AppError('A product can have at most 8 images.', BAD_REQUEST, 'INVALID_PRODUCT_IMAGE');
  }
  const chosenPrimary = primaryToken || plan.find((image) => image.isPrimary)?.token || plan[0]?.token;
  if (chosenPrimary && !plan.some((image) => image.token === chosenPrimary)) {
    throw new AppError('Primary image selection is invalid.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field: 'primaryImageToken', message: 'Choose one of the product images as primary.' }]);
  }
  return plan.map((image) => ({ ...image, isPrimary: image.token === chosenPrimary }));
};

const ensureCategory = async (shopId, categoryId, currentCategoryId = null) => {
  const category = await findCategoryById(shopId, categoryId);
  if (!category) {
    throw new AppError('Selected category is not available to this shop.', BAD_REQUEST, 'PRODUCT_CATEGORY_MISMATCH');
  }
  if (category.status !== 'ACTIVE' && Number(categoryId) !== Number(currentCategoryId)) {
    throw new AppError('Products must use an active category.', BAD_REQUEST, 'CATEGORY_INACTIVE');
  }
};

const normalizeSkuPrefix = (categoryName) => String(categoryName || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90) || 'PRODUCT';

export const getProductSkuSuggestionForShop = async (shopId, query = {}) => {
  const categoryId = Number(query.categoryId);
  if (!Number.isSafeInteger(categoryId) || categoryId < 1) {
    throw new AppError('A valid category is required to generate a product SKU.', BAD_REQUEST, 'VALIDATION_ERROR');
  }

  const category = await findCategoryById(shopId, categoryId);
  if (!category) throw new AppError('Selected category is not available to this shop.', BAD_REQUEST, 'PRODUCT_CATEGORY_MISMATCH');

  const excludeId = query.excludeId ? Number(query.excludeId) : null;
  if (excludeId && Number.isSafeInteger(excludeId) && excludeId > 0) {
    const currentProduct = await findProductById(shopId, excludeId);
    if (!currentProduct) throw new AppError('Product not found.', NOT_FOUND, 'PRODUCT_NOT_FOUND');
    if (Number(currentProduct.categoryId) === categoryId) {
      const existingSku = await findProductBySku(shopId, currentProduct.sku, excludeId);
      return { sku: currentProduct.sku, available: !existingSku };
    }
  }

  const prefix = normalizeSkuPrefix(category.name);
  let sequence = await findHighestProductSkuSequence(shopId, prefix) + 1;
  let sku = `${prefix}-${String(sequence).padStart(4, '0')}`;
  while (await findProductBySku(shopId, sku)) {
    sequence += 1;
    sku = `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  return { sku, available: true };
};

const translateDuplicateSku = (error) => {
  if (error.code === 'ER_DUP_ENTRY') {
    throw new AppError('A product with this SKU already exists in this shop.', CONFLICT, 'PRODUCT_SKU_EXISTS');
  }
  throw error;
};

export const getProductsForShop = async (shopId, query = {}) => {
  const requestedPage = Number(query.page || 1);
  const requestedLimit = Number(query.limit || 20);
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.floor(requestedLimit))) : 20;
  const statusValue = String(query.status || '').toUpperCase();
  const options = {
    page,
    limit,
    search: String(query.search || '').trim(),
    categoryId: Number.isSafeInteger(Number(query.categoryId)) && Number(query.categoryId) > 0 ? Number(query.categoryId) : null,
    status: ['ACTIVE', 'INACTIVE', 'DRAFT'].includes(statusValue) ? statusValue : '',
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
  const totalItems = await countProductsByShop(shopId, options);
  const data = await findProductsByShop(shopId, options);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    data,
    pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
  };
};

export const getProductForShop = async (shopId, productId) => {
  const product = await findProductById(shopId, productId);
  if (!product) throw new AppError('Product not found.', NOT_FOUND, 'PRODUCT_NOT_FOUND');
  return product;
};

export const createProductForShop = async (shopId, payload = {}, files = [], audit = {}) => {
  const normalized = normalizeProduct(payload);
  validationErrors(normalized);
  await ensureCategory(shopId, normalized.categoryId);
  if (await findProductBySku(shopId, normalized.sku)) {
    throw new AppError('A product with this SKU already exists in this shop.', CONFLICT, 'PRODUCT_SKU_EXISTS');
  }

  const manifest = parseManifest(payload.imageManifest);
  const storedUrls = await storeProductImages(shopId, files);
  try {
    const images = buildImagePlan(manifest, files, storedUrls, [], payload.primaryImageToken);
    return await createProductRecord(shopId, { ...normalized, slug: slugifyProduct(normalized.name, normalized.sku) }, images, audit);
  } catch (error) {
    await deleteProductImages(storedUrls);
    return translateDuplicateSku(error);
  }
};

export const updateProductForShop = async (shopId, productId, payload = {}, files = [], audit = {}) => {
  const existing = await findProductById(shopId, productId);
  if (!existing) throw new AppError('Product not found.', NOT_FOUND, 'PRODUCT_NOT_FOUND');
  const normalized = normalizeProduct({ ...existing, ...payload });
  validationErrors(normalized);
  await ensureCategory(shopId, normalized.categoryId, existing.categoryId);
  if (normalized.sku !== existing.sku && await findProductBySku(shopId, normalized.sku, productId)) {
    throw new AppError('A product with this SKU already exists in this shop.', CONFLICT, 'PRODUCT_SKU_EXISTS');
  }

  const manifest = parseManifest(payload.imageManifest);
  const storedUrls = await storeProductImages(shopId, files);
  let committed = false;
  try {
    const images = buildImagePlan(manifest, files, storedUrls, existing.images, payload.primaryImageToken);
    const updated = await updateProductRecord(shopId, productId, { ...normalized, slug: slugifyProduct(normalized.name, normalized.sku) }, images, audit);
    if (!updated) throw new AppError('Product not found.', NOT_FOUND, 'PRODUCT_NOT_FOUND');
    committed = true;
    const retainedUrls = new Set(images.map((image) => image.imageUrl));
    try {
      await deleteProductImages(existing.images.filter((image) => !retainedUrls.has(image.imageUrl)).map((image) => image.imageUrl));
    } catch (cleanupError) {
      logger.warn('Unable to remove replaced product image files', { productId, shopId, error: cleanupError.message });
    }
    return updated;
  } catch (error) {
    if (!committed) await deleteProductImages(storedUrls);
    return translateDuplicateSku(error);
  }
};

export const updateProductStatusForShop = async (shopId, productId, payload = {}, audit = {}) => {
  const validation = validateProductStatus(payload);
  if (!validation.isValid) {
    throw new AppError('Invalid product status.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
  }
  const product = await updateProductStatusRecord(shopId, productId, String(payload.status).toUpperCase(), audit);
  if (!product) throw new AppError('Product not found.', NOT_FOUND, 'PRODUCT_NOT_FOUND');
  return product;
};

export const getProductImagePathForShop = async (shopId, imageShopId, filename) => {
  if (String(shopId) !== String(imageShopId)) {
    throw new AppError('Product image not found.', NOT_FOUND, 'PRODUCT_IMAGE_NOT_FOUND');
  }
  const imageUrl = `/api/v1/products/images/${imageShopId}/${filename}`;
  const storedUrl = await findProductImageForShop(shopId, imageUrl);
  const filePath = storedUrl && resolveProductImagePath(shopId, filename);
  if (!filePath) throw new AppError('Product image not found.', NOT_FOUND, 'PRODUCT_IMAGE_NOT_FOUND');
  return filePath;
};