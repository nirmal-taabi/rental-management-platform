import AppError from '../utils/AppError.js';
import { BAD_REQUEST, CONFLICT, NOT_FOUND } from '../constants/httpStatus.js';
import { INVENTORY_CONDITIONS, INVENTORY_STATUSES } from '../constants/inventory.constants.js';
import {
  countInventoryItemsByShop,
  createInventoryRecord,
  findActiveProductForShop,
  findInventoryAuditHistory,
  findInventoryByBarcode,
  findInventoryBySku,
  findInventoryItemById,
  findInventoryItemsByShop,
  summarizeInventoryByShop,
  updateInventoryConditionRecord,
  updateInventoryRecord,
  updateInventoryStatusRecord,
} from '../repositories/inventory.repository.js';
import { canTransitionInventoryStatus, getAllowedInventoryTransitions } from './inventoryStatus.service.js';
import { validateInventoryCondition, validateInventoryInput, validateInventoryStatus } from '../validators/inventory.validator.js';

const normalizePayload = (payload = {}) => ({
  productId: Number(payload.productId),
  sku: String(payload.sku || '').trim(),
  barcode: String(payload.barcode || '').trim(),
  qrCode: String(payload.qrCode || '').trim(),
  size: String(payload.size || '').trim(),
  color: String(payload.color || '').trim(),
  condition: String(payload.condition || 'GOOD').trim().toUpperCase(),
  purchaseDate: String(payload.purchaseDate || '').trim(),
  notes: String(payload.notes || '').trim(),
});

const validate = (payload, options) => {
  const result = validateInventoryInput(payload, options);
  if (!result.isValid) {
    throw new AppError('Invalid inventory data.', BAD_REQUEST, 'VALIDATION_ERROR', true, result.errors);
  }
};

const conflictForDuplicate = (error) => {
  if (error.code !== 'ER_DUP_ENTRY') throw error;
  if (String(error.message).includes('uq_inventory_items_shop_barcode')) {
    throw new AppError('This barcode already exists in this shop.', CONFLICT, 'INVENTORY_BARCODE_EXISTS');
  }
  throw new AppError('This inventory SKU already exists in this shop.', CONFLICT, 'INVENTORY_SKU_EXISTS');
};

const ensureProduct = async (shopId, productId) => {
  const product = await findActiveProductForShop(shopId, productId);
  if (!product) {
    throw new AppError('The selected product is unavailable in this shop.', BAD_REQUEST, 'INVENTORY_PRODUCT_MISMATCH');
  }
};

const validateListQuery = (query = {}) => {
  const status = String(query.status || '').trim().toUpperCase();
  const condition = String(query.condition || '').trim().toUpperCase();
  if (status && !INVENTORY_STATUSES.includes(status)) {
    throw new AppError('Invalid inventory status filter.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field: 'status', message: 'Status filter is not supported.' }]);
  }
  if (condition && !INVENTORY_CONDITIONS.includes(condition)) {
    throw new AppError('Invalid inventory condition filter.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field: 'condition', message: 'Condition filter is not supported.' }]);
  }
  for (const field of ['productId', 'categoryId']) {
    if (query[field] !== undefined && query[field] !== '' && (!Number.isSafeInteger(Number(query[field])) || Number(query[field]) < 1)) {
      throw new AppError('Invalid inventory filter.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field, message: `${field} must be a positive integer.` }]);
    }
  }
  if (String(query.size || '').length > 50 || String(query.color || '').length > 50) {
    throw new AppError('Invalid inventory filter.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field: 'size', message: 'Size and color filters must be 50 characters or fewer.' }]);
  }
};

export const getInventoryForShop = async (shopId, query = {}) => {
  validateListQuery(query);
  const pageValue = Number(query.page || 1);
  const limitValue = Number(query.limit || 20);
  const page = Number.isFinite(pageValue) ? Math.max(1, Math.floor(pageValue)) : 1;
  const limit = Number.isFinite(limitValue) ? Math.min(100, Math.max(1, Math.floor(limitValue))) : 20;
  const options = {
    page,
    limit,
    search: String(query.search || '').trim(),
    productId: Number.isSafeInteger(Number(query.productId)) && Number(query.productId) > 0 ? Number(query.productId) : null,
    categoryId: Number.isSafeInteger(Number(query.categoryId)) && Number(query.categoryId) > 0 ? Number(query.categoryId) : null,
    status: String(query.status || '').trim().toUpperCase(),
    condition: String(query.condition || '').trim().toUpperCase(),
    size: String(query.size || '').trim(),
    color: String(query.color || '').trim(),
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
  const [totalItems, data, summary] = await Promise.all([
    countInventoryItemsByShop(shopId, options),
    findInventoryItemsByShop(shopId, options),
    summarizeInventoryByShop(shopId),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    data,
    summary,
    pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
  };
};

export const getInventoryItemForShop = async (shopId, itemId) => {
  const item = await findInventoryItemById(shopId, itemId);
  if (!item) throw new AppError('Inventory item not found.', NOT_FOUND, 'INVENTORY_ITEM_NOT_FOUND');
  item.activity = await findInventoryAuditHistory(shopId, itemId);
  item.allowedStatusTransitions = getAllowedInventoryTransitions(item.status);
  return item;
};

export const getInventorySummaryForShop = async (shopId, query = {}) => {
  validateListQuery(query);
  const productId = query.productId ? Number(query.productId) : null;
  return summarizeInventoryByShop(shopId, { productId });
};

export const createInventoryItemForShop = async (shopId, payload = {}, audit = {}) => {
  const normalized = normalizePayload(payload);
  validate(normalized);
  await ensureProduct(shopId, normalized.productId);
  if (await findInventoryBySku(shopId, normalized.sku)) {
    throw new AppError('This inventory SKU already exists in this shop.', CONFLICT, 'INVENTORY_SKU_EXISTS');
  }
  if (normalized.barcode && await findInventoryByBarcode(shopId, normalized.barcode)) {
    throw new AppError('This barcode already exists in this shop.', CONFLICT, 'INVENTORY_BARCODE_EXISTS');
  }
  try {
    return await createInventoryRecord(shopId, normalized, audit);
  } catch (error) {
    return conflictForDuplicate(error);
  }
};

export const updateInventoryItemForShop = async (shopId, itemId, payload = {}, audit = {}) => {
  const existing = await findInventoryItemById(shopId, itemId);
  if (!existing) throw new AppError('Inventory item not found.', NOT_FOUND, 'INVENTORY_ITEM_NOT_FOUND');
  if (payload.productId !== undefined && Number(payload.productId) !== Number(existing.productId)) {
    throw new AppError('Changing the linked product is not supported for an inventory item.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field: 'productId', message: 'Create a new inventory item to associate a different product.' }]);
  }
  const normalized = normalizePayload({ ...existing, ...payload });
  validate(normalized, { partial: true });
  if (normalized.sku !== existing.sku && await findInventoryBySku(shopId, normalized.sku, itemId)) {
    throw new AppError('This inventory SKU already exists in this shop.', CONFLICT, 'INVENTORY_SKU_EXISTS');
  }
  if (normalized.barcode && normalized.barcode !== (existing.barcode || '') && await findInventoryByBarcode(shopId, normalized.barcode, itemId)) {
    throw new AppError('This barcode already exists in this shop.', CONFLICT, 'INVENTORY_BARCODE_EXISTS');
  }
  try {
    const updated = await updateInventoryRecord(shopId, itemId, normalized, audit);
    if (!updated) throw new AppError('Inventory item not found.', NOT_FOUND, 'INVENTORY_ITEM_NOT_FOUND');
    return updated;
  } catch (error) {
    return conflictForDuplicate(error);
  }
};

export const updateInventoryItemStatusForShop = async (shopId, itemId, payload = {}, audit = {}) => {
  const validation = validateInventoryStatus(payload);
  if (!validation.isValid) {
    throw new AppError('Invalid inventory status.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
  }
  const existing = await findInventoryItemById(shopId, itemId);
  if (!existing) throw new AppError('Inventory item not found.', NOT_FOUND, 'INVENTORY_ITEM_NOT_FOUND');
  const status = String(payload.status).toUpperCase();
  if (!canTransitionInventoryStatus(existing.status, status)) {
    throw new AppError(`Cannot transition inventory from ${existing.status} to ${status}.`, CONFLICT, 'INVENTORY_STATUS_TRANSITION_INVALID', true, [{ field: 'status', message: `Allowed transitions: ${getAllowedInventoryTransitions(existing.status).join(', ') || 'none'}.` }]);
  }
  const updated = await updateInventoryStatusRecord(shopId, itemId, status, audit);
  if (!updated) throw new AppError('Inventory item not found.', NOT_FOUND, 'INVENTORY_ITEM_NOT_FOUND');
  return updated;
};

export const updateInventoryItemConditionForShop = async (shopId, itemId, payload = {}, audit = {}) => {
  const validation = validateInventoryCondition(payload);
  if (!validation.isValid) {
    throw new AppError('Invalid inventory condition.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
  }
  const condition = String(payload.condition).toUpperCase();
  const updated = await updateInventoryConditionRecord(shopId, itemId, condition, audit);
  if (!updated) throw new AppError('Inventory item not found.', NOT_FOUND, 'INVENTORY_ITEM_NOT_FOUND');
  return updated;
};

export const retireInventoryItemForShop = async (shopId, itemId, audit = {}) => updateInventoryItemStatusForShop(shopId, itemId, { status: 'RETIRED' }, audit);