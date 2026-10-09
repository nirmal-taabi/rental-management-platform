import { BAD_REQUEST, NOT_FOUND } from '../constants/httpStatus.js';
import AppError from '../utils/AppError.js';
import { getAvailabilitySearchRange } from '../utils/availabilityDate.js';
import {
  findAvailabilityConflicts,
  findAvailabilityInventoryItem,
  findAvailabilityInventoryItems,
  findEditableBookingForAvailability,
  findAvailabilityProduct,
  findRentableInventoryForShop,
  findRentableInventoryForProduct,
} from '../repositories/availability.repository.js';
import { validateAvailabilityQuery, validateBulkAvailability, validateInventoryAvailability, validateProductAvailability } from '../validators/booking.validator.js';

const throwValidation = (errors) => {
  if (errors.length) throw new AppError('Invalid availability request.', BAD_REQUEST, 'VALIDATION_ERROR', true, errors);
};

const mapConflict = (row) => ({
  bookingId: row.booking_id,
  bookingNumber: row.booking_number,
  rentalStartDate: row.rental_start_date,
  rentalEndDate: row.rental_end_date,
  status: String(row.status).toUpperCase(),
});

const mapInventoryItem = (row) => ({
  id: row.id,
  inventoryItemId: row.id,
  productId: row.product_id,
  sku: row.sku,
  productSku: row.product_sku,
  productName: row.product_name,
  size: row.size,
  color: row.color,
  condition: String(row.physical_condition || 'GOOD').toUpperCase(),
  status: String(row.status || '').toUpperCase(),
  dailyRentalRate: row.daily_rental_rate,
  securityDeposit: row.security_deposit,
});

const isRentable = (row) => String(row.status).toUpperCase() === 'AVAILABLE'
  && String(row.physical_condition || '').toUpperCase() !== 'DAMAGED';

const conflictsByItem = (rows) => rows.reduce((groups, row) => {
  const id = String(row.inventory_item_id);
  groups[id] ||= [];
  groups[id].push(mapConflict(row));
  return groups;
}, {});

const getConflicts = (shopId, inventoryItemIds, startDate, endDate, excludeBookingId, connection) =>
  findAvailabilityConflicts(
    shopId,
    inventoryItemIds,
    getAvailabilitySearchRange(startDate, endDate),
    excludeBookingId,
    connection,
  );

export const checkInventoryAvailability = async (shopId, query = {}, connection) => {
  throwValidation(validateAvailabilityQuery(query));
  if (query.excludeBookingId && !await findEditableBookingForAvailability(shopId, Number(query.excludeBookingId), connection)) {
    throw new AppError('Editable booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
  }
  const item = await findAvailabilityInventoryItem(shopId, Number(query.inventoryItemId), connection);
  if (!item) throw new AppError('Inventory item not found.', NOT_FOUND, 'INVENTORY_ITEM_NOT_FOUND');
  const itemResult = mapInventoryItem(item);
  if (!isRentable(item)) return { available: false, inventoryItem: itemResult, conflicts: [], reason: 'INVENTORY_NOT_RENTABLE' };
  const rows = await getConflicts(shopId, [item.id], query.startDate, query.endDate, query.excludeBookingId || null, connection);
  return { available: rows.length === 0, inventoryItem: itemResult, conflicts: rows.map(mapConflict) };
};

export const checkBulkInventoryAvailability = async (shopId, payload = {}, connection) => {
  throwValidation(validateBulkAvailability(payload));
  if (payload.excludeBookingId && !await findEditableBookingForAvailability(shopId, Number(payload.excludeBookingId), connection)) {
    throw new AppError('Editable booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
  }
  const inventoryItemIds = [...new Set(payload.inventoryItemIds.map(Number))].sort((left, right) => left - right);
  const items = await findAvailabilityInventoryItems(shopId, inventoryItemIds, connection);
  const itemById = new Map(items.map((item) => [String(item.id), item]));
  const rentableIds = items.filter(isRentable).map((item) => item.id);
  const conflictRows = await getConflicts(shopId, rentableIds, payload.startDate, payload.endDate, payload.excludeBookingId || null, connection);
  const grouped = conflictsByItem(conflictRows);
  return {
    items: inventoryItemIds.map((inventoryItemId) => {
      const item = itemById.get(String(inventoryItemId));
      if (!item) return { inventoryItemId, available: false, conflicts: [], reason: 'INVENTORY_ITEM_NOT_FOUND' };
      if (!isRentable(item)) return { inventoryItemId, available: false, conflicts: [], reason: 'INVENTORY_NOT_RENTABLE' };
      const conflicts = grouped[String(item.id)] || [];
      return { inventoryItemId, available: conflicts.length === 0, conflicts };
    }),
  };
};

export const getProductAvailability = async (shopId, query = {}, connection) => {
  throwValidation(validateProductAvailability(query));
  if (query.excludeBookingId && !await findEditableBookingForAvailability(shopId, Number(query.excludeBookingId), connection)) {
    throw new AppError('Editable booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
  }
  const product = await findAvailabilityProduct(shopId, Number(query.productId), connection);
  if (!product) throw new AppError('Product not found.', NOT_FOUND, 'PRODUCT_NOT_FOUND');
  const items = await findRentableInventoryForProduct(shopId, product.id, connection);
  const conflictRows = await getConflicts(shopId, items.map((item) => item.id), query.startDate, query.endDate, query.excludeBookingId || null, connection);
  const grouped = conflictsByItem(conflictRows);
  return {
    product: { id: product.id, sku: product.sku, name: product.name },
    items: items.map((item) => {
      const conflicts = grouped[String(item.id)] || [];
      return { ...mapInventoryItem(item), available: conflicts.length === 0, conflicts };
    }),
  };
};

export const getShopInventoryAvailability = async (shopId, query = {}, connection) => {
  throwValidation(validateInventoryAvailability(query));
  if (query.excludeBookingId && !await findEditableBookingForAvailability(shopId, Number(query.excludeBookingId), connection)) {
    throw new AppError('Editable booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
  }
  const { rows, totalItems, page, limit } = await findRentableInventoryForShop(shopId, {
    page: query.page,
    limit: query.limit,
    search: String(query.search || '').trim(),
    categoryId: query.categoryId ? Number(query.categoryId) : null,
    size: String(query.size || '').trim(),
    color: String(query.color || '').trim(),
  }, connection);
  const conflictRows = await getConflicts(shopId, rows.map((item) => item.id), query.startDate, query.endDate, query.excludeBookingId || null, connection);
  const grouped = conflictsByItem(conflictRows);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    items: rows.map((item) => {
      const conflicts = grouped[String(item.id)] || [];
      return { ...mapInventoryItem(item), available: conflicts.length === 0, conflicts };
    }),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};