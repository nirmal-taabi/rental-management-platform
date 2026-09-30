import { pool } from '../config/database.js';
import { canTransitionBookingStatus } from './bookingStatus.service.js';
import { PICKUP_ELIGIBLE_BOOKING_STATUSES } from '../constants/return.constants.js';
import { BAD_REQUEST, CONFLICT, NOT_FOUND } from '../constants/httpStatus.js';
import AppError from '../utils/AppError.js';
import { createAuditLog } from '../repositories/audit.repository.js';
import {
  completeBookingReturn,
  countBookingReturns,
  countInventoryReturns,
  countReturnsByShop,
  createReturnItemRecord,
  createReturnRecord,
  findBookingForLifecycle,
  findBookingItemsForUpdate,
  findBookingReturns,
  findInventoryItemsForUpdate,
  findInventoryItemForReturnHistory,
  findInventoryReturns,
  findPickupByBooking,
  findReturnById,
  findReturnedBookingItemIds,
  findReturnsByShop,
  markBookingItemReturned,
  markBookingItemsPickedUp,
  updateBookingPickup,
  updateLifecycleInventoryState,
  updateLifecycleInventoryStatus,
} from '../repositories/return.repository.js';
import { getReturnStatus } from './returnDate.service.js';
import { validatePickupInput, validateReturnInput, validateReturnListQuery } from '../validators/return.validator.js';

const throwValidation = (errors, message = 'Invalid pickup or return data.') => {
  if (errors.length) throw new AppError(message, BAD_REQUEST, 'VALIDATION_ERROR', true, errors);
};

const parseId = (value, resource) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError(`${resource} not found.`, NOT_FOUND, `${resource.toUpperCase()}_NOT_FOUND`);
  return id;
};

const withReturnDate = (record) => {
  const dateStatus = getReturnStatus(record.expectedReturnDate, record.returnedAt);
  return { ...record, ...dateStatus, status: String(record.status).toUpperCase() };
};

const sortedIds = (ids) => [...new Set(ids.map(Number))].sort((left, right) => left - right);
const sortedIdsEqual = (first, second) => {
  const left = first.map(Number).sort((a, b) => a - b);
  const right = second.map(Number).sort((a, b) => a - b);
  return left.length === right.length && left.every((id, index) => id === right[index]);
};

const lockRequestedItems = async (shopId, requestItems, bookingItems, connection) => {
  const bookingItemById = new Map(bookingItems.map((item) => [String(item.booking_item_id), item]));
  const errors = [];
  for (const requested of requestItems) {
    const bookingItem = bookingItemById.get(String(Number(requested.bookingItemId)));
    if (!bookingItem || Number(bookingItem.inventory_item_id) !== Number(requested.inventoryItemId)) {
      errors.push({ bookingItemId: Number(requested.bookingItemId), reason: 'BOOKING_ITEM_INVENTORY_MISMATCH' });
    }
  }
  if (errors.length) throw new AppError('One or more items do not belong to this booking.', BAD_REQUEST, 'RETURN_ITEM_MISMATCH', true, { conflicts: errors });
  const itemIds = sortedIds(requestItems.map((item) => item.inventoryItemId));
  const lockedInventory = await findInventoryItemsForUpdate(shopId, itemIds, connection);
  const inventoryById = new Map(lockedInventory.map((item) => [String(item.id), item]));
  return requestItems.map((requested) => ({
    requested,
    bookingItem: bookingItemById.get(String(Number(requested.bookingItemId))),
    inventory: inventoryById.get(String(Number(requested.inventoryItemId))),
  }));
};

export const confirmBookingPickup = async (shopId, bookingId, userId, payload = {}, audit = {}) => {
  throwValidation(validatePickupInput(payload), 'Invalid pickup data.');
  const id = parseId(bookingId, 'Booking');
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const initialBooking = await findBookingForLifecycle(shopId, id, connection, false);
    if (!initialBooking) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
    const initialBookingItems = await findBookingItemsForUpdate(shopId, id, connection, false);
    const initialInventoryIds = sortedIds(initialBookingItems.map((item) => item.inventory_item_id).filter(Boolean));
    await findInventoryItemsForUpdate(shopId, initialInventoryIds, connection);
    const booking = await findBookingForLifecycle(shopId, id, connection, true);
    if (!booking) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
    const bookingStatus = String(booking.status).toUpperCase();
    if (!PICKUP_ELIGIBLE_BOOKING_STATUSES.includes(bookingStatus)) {
      throw new AppError('This booking is not ready for pickup.', CONFLICT, 'BOOKING_NOT_READY_FOR_PICKUP');
    }
    if (booking.picked_up_at) throw new AppError('Pickup has already been completed.', CONFLICT, 'PICKUP_ALREADY_COMPLETED');
    if (!canTransitionBookingStatus(bookingStatus, 'ACTIVE')) {
      throw new AppError('This booking cannot transition to active.', CONFLICT, 'BOOKING_STATUS_TRANSITION_INVALID');
    }
    const bookingItems = await findBookingItemsForUpdate(shopId, id, connection, true);
    const currentInventoryIds = sortedIds(bookingItems.map((item) => item.inventory_item_id).filter(Boolean));
    if (!sortedIdsEqual(initialInventoryIds, currentInventoryIds)) {
      throw new AppError('This booking changed during pickup. Reload and retry.', CONFLICT, 'BOOKING_CHANGED_RETRY');
    }
    if (!bookingItems.length || bookingItems.length !== payload.items.length) {
      throw new AppError('Pickup must include every item on the booking.', CONFLICT, 'PICKUP_ITEMS_INCOMPLETE');
    }
    const locked = await lockRequestedItems(shopId, payload.items, bookingItems, connection);
    const issues = [];
    for (const entry of locked) {
      const itemStatus = String(entry.bookingItem.booking_item_status).toLowerCase();
      if (!['pending', 'assigned'].includes(itemStatus)) issues.push({ inventoryItemId: entry.requested.inventoryItemId, reason: 'BOOKING_ITEM_NOT_PICKUP_ELIGIBLE' });
      if (!entry.inventory) issues.push({ inventoryItemId: entry.requested.inventoryItemId, reason: 'INVENTORY_ITEM_NOT_FOUND' });
      else {
        const status = String(entry.inventory.status).toUpperCase();
        if (!['AVAILABLE', 'RESERVED'].includes(status)) issues.push({ inventoryItemId: entry.inventory.id, reason: status === 'RENTED' ? 'INVENTORY_ALREADY_RENTED' : 'INVENTORY_NOT_RENTABLE' });
        if (String(entry.inventory.physical_condition).toUpperCase() === 'DAMAGED') issues.push({ inventoryItemId: entry.inventory.id, reason: 'INVENTORY_NOT_RENTABLE' });
        if (Number(entry.inventory.product_id) !== Number(entry.bookingItem.product_id)) issues.push({ inventoryItemId: entry.inventory.id, reason: 'PRODUCT_MISMATCH' });
      }
    }
    if (issues.length) throw new AppError('One or more items cannot be handed to the customer.', CONFLICT, 'PICKUP_ITEMS_INVALID', true, { conflicts: issues });

    for (const entry of locked) {
      await updateLifecycleInventoryStatus(shopId, entry.inventory.id, 'RENTED', connection);
      await createAuditLog({
        ...audit,
        shopId,
        entityType: 'inventory_item',
        entityId: entry.inventory.id,
        action: 'INVENTORY_MARKED_RENTED',
        oldValues: { status: entry.inventory.status },
        newValues: { status: 'RENTED', bookingId: id },
      }, connection);
    }
    await markBookingItemsPickedUp(shopId, id, connection);
    await updateBookingPickup(shopId, id, userId, String(payload.pickupNotes || '').trim(), connection);
    const pickup = await findPickupByBooking(shopId, id, connection);
    await createAuditLog({
      ...audit,
      shopId,
      entityType: 'booking',
      entityId: id,
      action: 'PICKUP_COMPLETED',
      oldValues: { status: bookingStatus },
      newValues: { status: 'ACTIVE', pickedUpAt: pickup.pickedUpAt, itemCount: pickup.items.length, pickupNotes: pickup.pickupNotes },
    }, connection);
    await connection.commit();
    return pickup;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getBookingPickupForShop = async (shopId, bookingId) => {
  const id = parseId(bookingId, 'Booking');
  const pickup = await findPickupByBooking(shopId, id);
  if (!pickup) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
  if (!pickup.pickedUpAt) throw new AppError('Pickup has not been completed.', NOT_FOUND, 'PICKUP_NOT_FOUND');
  return pickup;
};

export const recordBookingReturn = async (shopId, bookingId, userId, payload = {}, audit = {}) => {
  throwValidation(validateReturnInput(payload), 'Invalid return data.');
  const id = parseId(bookingId, 'Booking');
  const returnedAt = payload.returnedAt ? new Date(payload.returnedAt).toISOString() : new Date().toISOString();
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const initialBooking = await findBookingForLifecycle(shopId, id, connection, false);
    if (!initialBooking) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
    const initialBookingItems = await findBookingItemsForUpdate(shopId, id, connection, false);
    const initialInventoryIds = sortedIds(initialBookingItems.map((item) => item.inventory_item_id).filter(Boolean));
    await findInventoryItemsForUpdate(shopId, initialInventoryIds, connection);
    const booking = await findBookingForLifecycle(shopId, id, connection, true);
    if (!booking) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
    if (String(booking.status).toUpperCase() !== 'ACTIVE') {
      throw new AppError('Only active bookings can be returned.', CONFLICT, 'BOOKING_NOT_ACTIVE_FOR_RETURN');
    }
    const bookingItems = await findBookingItemsForUpdate(shopId, id, connection, true);
    const currentInventoryIds = sortedIds(bookingItems.map((item) => item.inventory_item_id).filter(Boolean));
    if (!sortedIdsEqual(initialInventoryIds, currentInventoryIds)) {
      throw new AppError('This booking changed during return. Reload and retry.', CONFLICT, 'BOOKING_CHANGED_RETRY');
    }
    const previouslyReturned = new Set(await findReturnedBookingItemIds(shopId, id, connection));
    const outstandingItems = bookingItems.filter((item) => !previouslyReturned.has(Number(item.booking_item_id)) && String(item.booking_item_status).toLowerCase() === 'active');
    if (!outstandingItems.length) throw new AppError('All booking items have already been returned.', CONFLICT, 'RETURN_ALREADY_COMPLETED');
    const requestedIds = new Set(payload.items.map((item) => Number(item.bookingItemId)));
    const issues = payload.items
      .filter((item) => !outstandingItems.some((outstanding) => Number(outstanding.booking_item_id) === Number(item.bookingItemId)))
      .map((item) => ({ bookingItemId: Number(item.bookingItemId), reason: previouslyReturned.has(Number(item.bookingItemId)) ? 'ITEM_ALREADY_RETURNED' : 'BOOKING_ITEM_NOT_OUTSTANDING' }));
    if (issues.length) throw new AppError('One or more selected items are not outstanding on this booking.', CONFLICT, 'RETURN_ITEMS_INVALID', true, { conflicts: issues });
    const locked = await lockRequestedItems(shopId, payload.items, bookingItems, connection);
    const invalidInventory = locked.filter((entry) => !entry.inventory
      || String(entry.inventory.status).toUpperCase() !== 'RENTED'
      || Number(entry.inventory.product_id) !== Number(entry.bookingItem.product_id));
    if (invalidInventory.length) {
      throw new AppError('One or more items are not currently rented.', CONFLICT, 'INVENTORY_NOT_RENTED', true, {
        conflicts: invalidInventory.map((entry) => ({
          inventoryItemId: entry.requested.inventoryItemId,
          reason: !entry.inventory ? 'INVENTORY_ITEM_NOT_FOUND'
            : Number(entry.inventory.product_id) !== Number(entry.bookingItem.product_id) ? 'PRODUCT_MISMATCH'
              : 'INVENTORY_NOT_RENTED',
        })),
      });
    }
    const returnStatus = getReturnStatus(booking.rental_end_date, returnedAt);
    const isFullReturn = requestedIds.size === outstandingItems.length;
    const workflowStatus = isFullReturn ? 'completed' : 'partial';
    const returnId = await createReturnRecord(shopId, booking, userId, returnedAt, workflowStatus, String(payload.notes || '').trim(), connection);
    for (const entry of locked) {
      const item = {
        bookingItemId: Number(entry.bookingItem.booking_item_id),
        inventoryItemId: Number(entry.inventory.id),
        condition: String(entry.requested.condition).toUpperCase(),
        damageStatus: String(entry.requested.damageStatus).toUpperCase(),
        notes: String(entry.requested.notes || '').trim(),
      };
      await createReturnItemRecord(shopId, returnId, item, returnedAt, connection);
      await markBookingItemReturned(shopId, item.bookingItemId, connection);
      const nextInventoryStatus = item.damageStatus === 'LOST' ? 'LOST' : 'INSPECTION';
      await updateLifecycleInventoryState(shopId, item.inventoryItemId, nextInventoryStatus, item.condition, connection);
      await createAuditLog({
        ...audit,
        shopId,
        entityType: 'inventory_item',
        entityId: item.inventoryItemId,
        action: nextInventoryStatus === 'LOST' ? 'INVENTORY_MARKED_LOST' : 'INVENTORY_MARKED_INSPECTION',
        oldValues: { status: entry.inventory.status },
        newValues: { status: nextInventoryStatus, bookingId: id, returnId },
      }, connection);
      await createAuditLog({
        ...audit,
        shopId,
        entityType: 'return',
        entityId: returnId,
        action: 'RETURN_CONDITION_UPDATED',
        newValues: { bookingItemId: item.bookingItemId, inventoryItemId: item.inventoryItemId, condition: item.condition, damageStatus: item.damageStatus, notes: item.notes },
      }, connection);
      if (item.damageStatus !== 'NONE') {
        await createAuditLog({
          ...audit,
          shopId,
          entityType: 'return',
          entityId: returnId,
          action: 'RETURN_DAMAGE_RECORDED',
          newValues: { bookingItemId: item.bookingItemId, inventoryItemId: item.inventoryItemId, damageStatus: item.damageStatus },
        }, connection);
      }
    }
    const allReturned = bookingItems.every((item) => previouslyReturned.has(Number(item.booking_item_id)) || requestedIds.has(Number(item.booking_item_id)));
    if (allReturned) {
      if (!canTransitionBookingStatus('ACTIVE', 'COMPLETED')) throw new AppError('Booking cannot be completed from its current state.', CONFLICT, 'BOOKING_STATUS_TRANSITION_INVALID');
      await completeBookingReturn(shopId, id, returnedAt, connection);
    }
    const result = await findReturnById(shopId, returnId, connection);
    result.returnStatus = returnStatus.returnStatus;
    result.daysLate = returnStatus.daysLate;
    result.expectedReturnDate = returnStatus.expectedReturnDate;
    result.actualReturnDate = returnStatus.actualReturnDate;
    await createAuditLog({
      ...audit,
      shopId,
      entityType: 'booking',
      entityId: id,
      action: allReturned ? 'RETURN_COMPLETED' : 'PARTIAL_RETURN',
      oldValues: { status: 'ACTIVE' },
      newValues: { status: allReturned ? 'COMPLETED' : 'ACTIVE', returnId, returnedItemCount: locked.length, remainingItemCount: outstandingItems.length - locked.length, returnStatus: returnStatus.returnStatus },
    }, connection);
    await connection.commit();
    return result;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getReturnListOptions = (query = {}) => {
  throwValidation(validateReturnListQuery(query), 'Invalid return filters.');
  const pageValue = Number(query.page || 1);
  const limitValue = Number(query.limit || 20);
  const page = Number.isFinite(pageValue) ? Math.max(1, Math.floor(pageValue)) : 1;
  const limit = Number.isFinite(limitValue) ? Math.min(100, Math.max(1, Math.floor(limitValue))) : 20;
  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search: String(query.search || '').trim(),
    status: String(query.status || '').toUpperCase(),
    damageStatus: String(query.damageStatus || '').toUpperCase(),
    bookingId: query.bookingId ? Number(query.bookingId) : null,
    customerId: query.customerId ? Number(query.customerId) : null,
    startDate: query.startDate || null,
    endDate: query.endDate || null,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
};

const addReturnDateStatuses = (records) => records.map((record) => ({
  ...record,
  ...getReturnStatus(record.expectedReturnDate, record.returnedAt),
  status: String(record.status || '').toUpperCase(),
}));

export const getReturnForShop = async (shopId, returnId) => {
  const result = await findReturnById(shopId, parseId(returnId, 'Return'));
  if (!result) throw new AppError('Return not found.', NOT_FOUND, 'RETURN_NOT_FOUND');
  return withReturnDate(result);
};

export const listReturnsForShop = async (shopId, query = {}) => {
  const options = getReturnListOptions(query);
  const [totalItems, data] = await Promise.all([
    countReturnsByShop(shopId, options),
    findReturnsByShop(shopId, options),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / options.limit));
  return {
    data: addReturnDateStatuses(data),
    pagination: { page: options.page, limit: options.limit, totalItems, totalPages, hasNextPage: options.page < totalPages, hasPreviousPage: options.page > 1 },
  };
};

export const getBookingReturnHistoryForShop = async (shopId, bookingId, query = {}) => {
  const id = parseId(bookingId, 'Booking');
  const booking = await findBookingForLifecycle(shopId, id, undefined, false);
  if (!booking) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
  const options = getReturnListOptions(query);
  const [totalItems, data] = await Promise.all([
    countBookingReturns(shopId, id),
    findBookingReturns(shopId, id, options),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / options.limit));
  return { data: addReturnDateStatuses(data), pagination: { page: options.page, limit: options.limit, totalItems, totalPages, hasNextPage: options.page < totalPages, hasPreviousPage: options.page > 1 } };
};

export const getInventoryReturnHistoryForShop = async (shopId, inventoryItemId, query = {}) => {
  const id = parseId(inventoryItemId, 'Inventory item');
  const options = getReturnListOptions(query);
  const inventoryItem = await findInventoryItemForReturnHistory(shopId, id);
  if (!inventoryItem) throw new AppError('Inventory item not found.', NOT_FOUND, 'INVENTORY_ITEM_NOT_FOUND');
  const [totalItems, data] = await Promise.all([
    countInventoryReturns(shopId, id),
    findInventoryReturns(shopId, id, options),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / options.limit));
  return { data: addReturnDateStatuses(data), pagination: { page: options.page, limit: options.limit, totalItems, totalPages, hasNextPage: options.page < totalPages, hasPreviousPage: options.page > 1 } };
};