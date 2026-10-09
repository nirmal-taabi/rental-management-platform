import { BOOKING_STATUSES } from '../constants/booking.constants.js';
import { isValidRentalRange } from '../utils/availabilityDate.js';

const isPositiveId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;

export const validateAvailabilityQuery = (query = {}) => {
  const errors = [];
  if (!isPositiveId(query.inventoryItemId)) errors.push({ field: 'inventoryItemId', message: 'A valid inventory item is required.' });
  if (!isValidRentalRange(query.startDate, query.endDate)) errors.push({ field: 'dateRange', message: 'Valid startDate and endDate are required, and endDate must not precede startDate.' });
  if (query.excludeBookingId !== undefined && !isPositiveId(query.excludeBookingId)) errors.push({ field: 'excludeBookingId', message: 'excludeBookingId must be a positive integer.' });
  return errors;
};

export const validateBulkAvailability = (payload = {}) => {
  const errors = [];
  if (!Array.isArray(payload.inventoryItemIds) || payload.inventoryItemIds.length < 1 || payload.inventoryItemIds.length > 100) {
    errors.push({ field: 'inventoryItemIds', message: 'Provide between 1 and 100 inventory item IDs.' });
  } else if (payload.inventoryItemIds.some((id) => !isPositiveId(id))) {
    errors.push({ field: 'inventoryItemIds', message: 'Every inventory item ID must be a positive integer.' });
  }
  if (!isValidRentalRange(payload.startDate, payload.endDate)) errors.push({ field: 'dateRange', message: 'Valid startDate and endDate are required, and endDate must not precede startDate.' });
  if (payload.excludeBookingId !== undefined && !isPositiveId(payload.excludeBookingId)) errors.push({ field: 'excludeBookingId', message: 'excludeBookingId must be a positive integer.' });
  return errors;
};

export const validateProductAvailability = (query = {}) => {
  const errors = [];
  if (!isPositiveId(query.productId)) errors.push({ field: 'productId', message: 'A valid product is required.' });
  if (!isValidRentalRange(query.startDate, query.endDate)) errors.push({ field: 'dateRange', message: 'Valid startDate and endDate are required, and endDate must not precede startDate.' });
  if (query.excludeBookingId !== undefined && !isPositiveId(query.excludeBookingId)) errors.push({ field: 'excludeBookingId', message: 'excludeBookingId must be a positive integer.' });
  return errors;
};

export const validateInventoryAvailability = (query = {}) => {
  const errors = [];
  if (!isValidRentalRange(query.startDate, query.endDate)) errors.push({ field: 'dateRange', message: 'Valid startDate and endDate are required, and endDate must not precede startDate.' });
  if (query.excludeBookingId !== undefined && !isPositiveId(query.excludeBookingId)) errors.push({ field: 'excludeBookingId', message: 'excludeBookingId must be a positive integer.' });
  if (query.categoryId !== undefined && query.categoryId !== '' && !isPositiveId(query.categoryId)) errors.push({ field: 'categoryId', message: 'categoryId must be a positive integer.' });
  if (query.search !== undefined && String(query.search).trim().length > 100) errors.push({ field: 'search', message: 'Search must be 100 characters or fewer.' });
  for (const field of ['size', 'color']) {
    if (query[field] !== undefined && String(query[field]).trim().length > 50) {
      errors.push({ field, message: `${field} must be 50 characters or fewer.` });
    }
  }
  for (const field of ['page', 'limit']) {
    if (query[field] !== undefined && (!isPositiveId(query[field]) || Number(query[field]) > (field === 'page' ? 1000000 : 100))) {
      errors.push({ field, message: field === 'page' ? 'page must be a positive integer.' : 'limit must be between 1 and 100.' });
    }
  }
  return errors;
};

export const validateBookingInput = (payload = {}) => {
  const errors = [];
  if (!isPositiveId(payload.customerId)) errors.push({ field: 'customerId', message: 'A valid customer is required.' });
  if (!isValidRentalRange(payload.rentalStartDate, payload.rentalEndDate)) errors.push({ field: 'rentalDates', message: 'Valid rental start and end dates are required.' });
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 100) {
    errors.push({ field: 'items', message: 'A booking must contain between 1 and 100 physical inventory items.' });
  } else {
    const ids = payload.items.map((item) => Number(item.inventoryItemId));
    if (payload.items.some((item) => !isPositiveId(item.productId) || !isPositiveId(item.inventoryItemId))) {
      errors.push({ field: 'items', message: 'Every booking item must include valid productId and inventoryItemId values.' });
    }
    if (new Set(ids).size !== ids.length) errors.push({ field: 'items', message: 'An inventory item can only be selected once per booking.' });
  }
  for (const field of ['discountAmount', 'taxAmount']) {
    if (payload[field] !== undefined && !/^\d{1,10}(?:\.\d{1,2})?$/.test(String(payload[field]))) {
      errors.push({ field, message: `${field} must be a non-negative amount with up to two decimal places.` });
    }
  }
  if (payload.notes !== undefined && String(payload.notes).length > 5000) errors.push({ field: 'notes', message: 'Notes must be 5000 characters or fewer.' });
  return errors;
};

export const validateBookingStatus = (status) => BOOKING_STATUSES.includes(String(status || '').toUpperCase());