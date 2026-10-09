import { pool } from '../config/database.js';
import { BLOCKING_BOOKING_STATUSES, EDITABLE_BOOKING_STATUSES } from '../constants/booking.constants.js';
import { BAD_REQUEST, CONFLICT, NOT_FOUND } from '../constants/httpStatus.js';
import AppError from '../utils/AppError.js';
import { createAuditLog } from '../repositories/audit.repository.js';
import {
  countBookingsByShop,
  createBookingRecord,
  findActiveBookingCustomer,
  findBookingAuditHistory,
  findBookingById,
  findBookingForUpdate,
  findBookingInventoryIds,
  findBookingsByShop,
  getBookingSummaryByShop,
  updateBookingRecord,
  updateBookingStatusRecord,
} from '../repositories/booking.repository.js';
import { findAvailabilityConflicts, findAvailabilityInventoryItems } from '../repositories/availability.repository.js';
import { calculateBookingPricing } from './bookingPricing.service.js';
import { canManuallyTransitionBookingStatus } from './bookingStatus.service.js';
import { getAvailabilitySearchRange, isBusinessDate } from '../utils/availabilityDate.js';
import { validateBookingInput, validateBookingStatus } from '../validators/booking.validator.js';

const throwValidation = (errors) => {
  if (errors.length) throw new AppError('Invalid booking data.', BAD_REQUEST, 'VALIDATION_ERROR', true, errors);
};

const ensureCustomer = async (shopId, customerId, connection) => {
  const customer = await findActiveBookingCustomer(shopId, customerId, connection, true);
  if (!customer) throw new AppError('The selected customer is unavailable in this shop.', BAD_REQUEST, 'BOOKING_CUSTOMER_INVALID');
  return customer;
};

const lockAndValidateItems = async (shopId, payloadItems, connection) => {
  const inventoryItemIds = payloadItems.map((item) => Number(item.inventoryItemId)).sort((left, right) => left - right);
  const rows = await findAvailabilityInventoryItems(shopId, inventoryItemIds, connection, true);
  const itemById = new Map(rows.map((row) => [String(row.id), row]));
  const errors = [];
  for (const requested of payloadItems) {
    const row = itemById.get(String(Number(requested.inventoryItemId)));
    if (!row) {
      errors.push({ inventoryItemId: Number(requested.inventoryItemId), reason: 'INVENTORY_ITEM_NOT_FOUND' });
    } else if (Number(row.product_id) !== Number(requested.productId)) {
      errors.push({ inventoryItemId: Number(requested.inventoryItemId), reason: 'PRODUCT_MISMATCH' });
    } else if (String(row.status).toUpperCase() !== 'AVAILABLE' || String(row.physical_condition).toUpperCase() === 'DAMAGED') {
      errors.push({ inventoryItemId: Number(requested.inventoryItemId), reason: 'INVENTORY_NOT_RENTABLE' });
    }
  }
  if (errors.length) {
    throw new AppError('One or more selected physical items cannot be rented.', CONFLICT, 'INVENTORY_NOT_RENTABLE', true, { conflicts: errors });
  }
  return payloadItems.map((requested) => {
    const row = itemById.get(String(Number(requested.inventoryItemId)));
    return {
      productId: Number(requested.productId),
      inventoryItemId: Number(requested.inventoryItemId),
      dailyRentalRate: row.daily_rental_rate,
      securityDeposit: row.security_deposit,
      discountAmount: requested.discountAmount || 0,
      taxAmount: requested.taxAmount || 0,
      notes: String(requested.notes || '').trim(),
    };
  });
};

const ensureAvailableForDates = async (shopId, itemIds, startDate, endDate, connection, excludeBookingId = null) => {
  const dateRange = getAvailabilitySearchRange(startDate, endDate);
  const rows = await findAvailabilityConflicts(shopId, itemIds, dateRange, excludeBookingId, connection, true);
  if (!rows.length) return;
  const conflicts = rows.map((row) => ({
    inventoryItemId: row.inventory_item_id,
    bookingId: row.booking_id,
    bookingNumber: row.booking_number,
    rentalStartDate: row.rental_start_date,
    rentalEndDate: row.rental_end_date,
    status: String(row.status).toUpperCase(),
  }));
  throw new AppError(
    'One or more selected items are unavailable for the requested rental period.',
    CONFLICT,
    'INVENTORY_NOT_AVAILABLE',
    true,
    { conflicts },
  );
};

const getPricing = (payload, items) => calculateBookingPricing({
  items,
  rentalStartDate: payload.rentalStartDate,
  rentalEndDate: payload.rentalEndDate,
  discountAmount: payload.discountAmount || 0,
  taxAmount: payload.taxAmount || 0,
});

const validateListQuery = (query = {}) => {
  const errors = [];
  if (query.status && !validateBookingStatus(query.status)) errors.push({ field: 'status', message: 'Status filter is not supported.' });
  if (query.customerId && (!Number.isSafeInteger(Number(query.customerId)) || Number(query.customerId) < 1)) errors.push({ field: 'customerId', message: 'Customer ID must be a positive integer.' });
  if (query.bookingDate && !isBusinessDate(query.bookingDate)) errors.push({ field: 'bookingDate', message: 'Booking date must use YYYY-MM-DD.' });
  if (query.startDate && !isBusinessDate(query.startDate)) errors.push({ field: 'startDate', message: 'Start date must use YYYY-MM-DD.' });
  if (query.endDate && !isBusinessDate(query.endDate)) errors.push({ field: 'endDate', message: 'End date must use YYYY-MM-DD.' });
  if (query.startDate && query.endDate && query.endDate < query.startDate) errors.push({ field: 'dateRange', message: 'End date must not precede start date.' });
  if (String(query.search || '').length > 150) errors.push({ field: 'search', message: 'Search must be 150 characters or fewer.' });
  if (errors.length) throwValidation(errors);
};

const parseBookingId = (bookingId) => {
  const value = Number(bookingId);
  if (!Number.isSafeInteger(value) || value < 1) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
  return value;
};

const sortedIdsEqual = (first, second) => {
  const left = first.map(Number).sort((a, b) => a - b);
  const right = second.map(Number).sort((a, b) => a - b);
  return left.length === right.length && left.every((id, index) => id === right[index]);
};

export const listBookingsForShop = async (shopId, query = {}) => {
  validateListQuery(query);
  const pageValue = Number(query.page || 1);
  const limitValue = Number(query.limit || 20);
  const page = Number.isFinite(pageValue) ? Math.max(1, Math.floor(pageValue)) : 1;
  const limit = Number.isFinite(limitValue) ? Math.min(100, Math.max(1, Math.floor(limitValue))) : 20;
  const options = {
    page,
    limit,
    offset: (page - 1) * limit,
    search: String(query.search || '').trim(),
    status: String(query.status || '').trim().toUpperCase(),
    customerId: query.customerId ? Number(query.customerId) : null,
    bookingDate: query.bookingDate || null,
    startDate: query.startDate || null,
    endDate: query.endDate || null,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
  const currentDate = new Date().toISOString().slice(0, 10);
  const [totalItems, data, summary] = await Promise.all([
    countBookingsByShop(shopId, options),
    findBookingsByShop(shopId, options),
    getBookingSummaryByShop(shopId, currentDate),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return { data, summary, pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } };
};

export const getBookingForShop = async (shopId, bookingId) => {
  const id = parseBookingId(bookingId);
  const booking = await findBookingById(shopId, id);
  if (!booking) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
  booking.activity = await findBookingAuditHistory(shopId, id);
  return booking;
};

export const createBookingForShop = async (shopId, userId, payload = {}, audit = {}) => {
  throwValidation(validateBookingInput(payload));
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    await ensureCustomer(shopId, Number(payload.customerId), connection);
    const items = await lockAndValidateItems(shopId, payload.items, connection);
    await ensureAvailableForDates(shopId, items.map((item) => item.inventoryItemId), payload.rentalStartDate, payload.rentalEndDate, connection);
    const pricing = getPricing(payload, items);
    const bookingId = await createBookingRecord(shopId, userId, payload, pricing, connection);
    const booking = await findBookingById(shopId, bookingId, connection, true);
    await createAuditLog({
      ...audit,
      shopId,
      entityType: 'booking',
      entityId: bookingId,
      action: 'CREATE_BOOKING',
      newValues: booking,
    }, connection);
    for (const item of booking.items || []) {
      await createAuditLog({
        ...audit,
        shopId,
        entityType: 'booking',
        entityId: bookingId,
        action: 'BOOKING_ITEM_ADDED',
        newValues: { productId: item.productId, inventoryItemId: item.inventoryItemId },
      }, connection);
    }
    booking.activity = await findBookingAuditHistory(shopId, bookingId, connection);
    await connection.commit();
    return booking;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateBookingForShop = async (shopId, bookingId, payload = {}, audit = {}) => {
  throwValidation(validateBookingInput(payload));
  const id = parseBookingId(bookingId);
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const existingItemIds = (await findBookingInventoryIds(shopId, id, connection)).map(Number);
    await ensureCustomer(shopId, Number(payload.customerId), connection);
    const requestedItemIds = payload.items.map((item) => Number(item.inventoryItemId));
    await findAvailabilityInventoryItems(shopId, [...new Set([...existingItemIds, ...requestedItemIds])].sort((left, right) => left - right), connection, true);
    const items = await lockAndValidateItems(shopId, payload.items, connection);
    const previous = await findBookingForUpdate(shopId, id, connection);
    if (!previous) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
    const currentItemIds = await findBookingInventoryIds(shopId, id, connection, true);
    if (!sortedIdsEqual(existingItemIds, currentItemIds)) {
      throw new AppError('This booking changed during the edit. Reload it and try again.', CONFLICT, 'BOOKING_CHANGED_RETRY');
    }
    const currentStatus = String(previous.status).toUpperCase();
    if (!EDITABLE_BOOKING_STATUSES.includes(currentStatus)) {
      throw new AppError('This booking can no longer be edited.', CONFLICT, 'BOOKING_NOT_EDITABLE');
    }
    const previousDetails = await findBookingById(shopId, id, connection, true);
    await ensureAvailableForDates(shopId, items.map((item) => item.inventoryItemId), payload.rentalStartDate, payload.rentalEndDate, connection, id);
    const pricing = getPricing(payload, items);
    const updated = await updateBookingRecord(shopId, id, payload, pricing, connection);
    if (!updated) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
    const booking = await findBookingById(shopId, id, connection, true);
    await createAuditLog({
      ...audit,
      shopId,
      entityType: 'booking',
      entityId: id,
      action: 'UPDATE_BOOKING',
      oldValues: previousDetails,
      newValues: booking,
    }, connection);
    const previousItemIds = new Set((previousDetails.items || []).map((item) => Number(item.inventoryItemId)));
    const updatedItemIds = new Set((booking.items || []).map((item) => Number(item.inventoryItemId)));
    for (const item of previousDetails.items || []) {
      if (!updatedItemIds.has(Number(item.inventoryItemId))) {
        await createAuditLog({
          ...audit,
          shopId,
          entityType: 'booking',
          entityId: id,
          action: 'BOOKING_ITEM_REMOVED',
          oldValues: { productId: item.productId, inventoryItemId: item.inventoryItemId },
        }, connection);
      }
    }
    for (const item of booking.items || []) {
      if (!previousItemIds.has(Number(item.inventoryItemId))) {
        await createAuditLog({
          ...audit,
          shopId,
          entityType: 'booking',
          entityId: id,
          action: 'BOOKING_ITEM_ADDED',
          newValues: { productId: item.productId, inventoryItemId: item.inventoryItemId },
        }, connection);
      }
    }
    booking.activity = await findBookingAuditHistory(shopId, id, connection);
    await connection.commit();
    return booking;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const changeBookingStatusForShop = async (shopId, bookingId, nextStatus, audit = {}) => {
  if (!validateBookingStatus(nextStatus)) {
    throw new AppError('Invalid booking status.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field: 'status', message: 'Status is not supported.' }]);
  }
  const id = parseBookingId(bookingId);
  const status = String(nextStatus).toUpperCase();
  if (status === 'COMPLETED') {
    throw new AppError('Complete this booking by recording the return of all its physical items.', CONFLICT, 'BOOKING_RETURN_REQUIRED');
  }
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const initialItemIds = (await findBookingInventoryIds(shopId, id, connection)).map(Number);
    const lockedItems = await findAvailabilityInventoryItems(shopId, [...new Set(initialItemIds)].sort((left, right) => left - right), connection, true);
    const previous = await findBookingForUpdate(shopId, id, connection);
    if (!previous) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
    const currentItemIds = await findBookingInventoryIds(shopId, id, connection, true);
    if (!sortedIdsEqual(initialItemIds, currentItemIds)) {
      throw new AppError('This booking changed during the status update. Reload it and try again.', CONFLICT, 'BOOKING_CHANGED_RETRY');
    }
    const currentStatus = String(previous.status).toUpperCase();
    if (!canManuallyTransitionBookingStatus(currentStatus, status)) {
      throw new AppError(`Cannot transition booking from ${currentStatus} to ${status}.`, CONFLICT, 'BOOKING_STATUS_TRANSITION_INVALID');
    }
    if (status === 'ACTIVE' && !previous.picked_up_at) {
      throw new AppError('Record the pickup before activating this booking.', CONFLICT, 'PICKUP_REQUIRED');
    }
    if (BLOCKING_BOOKING_STATUSES.includes(status) && !BLOCKING_BOOKING_STATUSES.includes(currentStatus)) {
      if (!initialItemIds.length || lockedItems.length !== initialItemIds.length || lockedItems.some((item) => String(item.status).toUpperCase() !== 'AVAILABLE' || String(item.physical_condition).toUpperCase() === 'DAMAGED')) {
        throw new AppError('One or more booking items cannot be reserved.', CONFLICT, 'INVENTORY_NOT_RENTABLE');
      }
      await ensureAvailableForDates(shopId, initialItemIds, previous.rental_start_date, previous.rental_end_date, connection, id);
    }
    await updateBookingStatusRecord(shopId, id, status, connection);
    const booking = await findBookingById(shopId, id, connection, true);
    await createAuditLog({
      ...audit,
      shopId,
      entityType: 'booking',
      entityId: id,
      action: status === 'CANCELLED' ? 'CANCEL_BOOKING' : status === 'READY' ? 'BOOKING_READY' : 'CHANGE_BOOKING_STATUS',
      oldValues: { status: currentStatus },
      newValues: { status, bookingNumber: booking.bookingNumber },
    }, connection);
    booking.activity = await findBookingAuditHistory(shopId, id, connection);
    await connection.commit();
    return booking;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};