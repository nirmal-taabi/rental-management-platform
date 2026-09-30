import { RETURN_CONDITIONS, RETURN_DAMAGE_STATUSES } from '../constants/return.constants.js';
import { isBusinessDate } from '../utils/availabilityDate.js';

const isPositiveId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const isTimestamp = (value) => value === undefined || value === null || value === '' || (!Number.isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T/.test(String(value)));

export const validatePickupInput = (payload = {}) => {
  const errors = [];
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 100) {
    errors.push({ field: 'items', message: 'Pickup must include every booking item.' });
  } else {
    const bookingItemIds = payload.items.map((item) => Number(item.bookingItemId));
    const inventoryItemIds = payload.items.map((item) => Number(item.inventoryItemId));
    if (payload.items.some((item) => !isPositiveId(item.bookingItemId) || !isPositiveId(item.inventoryItemId))) {
      errors.push({ field: 'items', message: 'Every pickup item must include valid bookingItemId and inventoryItemId values.' });
    }
    if (new Set(bookingItemIds).size !== bookingItemIds.length) errors.push({ field: 'items', message: 'A booking item can only be picked up once.' });
    if (new Set(inventoryItemIds).size !== inventoryItemIds.length) errors.push({ field: 'items', message: 'A physical item can only be picked up once.' });
  }
  if (payload.pickupNotes !== undefined && String(payload.pickupNotes).length > 2000) errors.push({ field: 'pickupNotes', message: 'Pickup notes must be 2000 characters or fewer.' });
  return errors;
};

export const validateReturnInput = (payload = {}) => {
  const errors = [];
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 100) {
    errors.push({ field: 'items', message: 'A return must include at least one outstanding booking item.' });
  } else {
    const bookingItemIds = payload.items.map((item) => Number(item.bookingItemId));
    const inventoryItemIds = payload.items.map((item) => Number(item.inventoryItemId));
    if (payload.items.some((item) => !isPositiveId(item.bookingItemId) || !isPositiveId(item.inventoryItemId))) {
      errors.push({ field: 'items', message: 'Every return item must include valid bookingItemId and inventoryItemId values.' });
    }
    if (new Set(bookingItemIds).size !== bookingItemIds.length) errors.push({ field: 'items', message: 'A booking item can only be returned once per request.' });
    if (new Set(inventoryItemIds).size !== inventoryItemIds.length) errors.push({ field: 'items', message: 'A physical item can only be returned once per request.' });
    payload.items.forEach((item, index) => {
      if (!RETURN_CONDITIONS.includes(String(item.condition || '').toUpperCase())) errors.push({ field: `items.${index}.condition`, message: 'Return condition is not supported.' });
      if (!RETURN_DAMAGE_STATUSES.includes(String(item.damageStatus || '').toUpperCase())) errors.push({ field: `items.${index}.damageStatus`, message: 'Damage status is not supported.' });
      if (item.notes !== undefined && String(item.notes).length > 2000) errors.push({ field: `items.${index}.notes`, message: 'Item notes must be 2000 characters or fewer.' });
    });
  }
  if (!isTimestamp(payload.returnedAt)) errors.push({ field: 'returnedAt', message: 'returnedAt must be a valid ISO timestamp.' });
  if (payload.notes !== undefined && String(payload.notes).length > 5000) errors.push({ field: 'notes', message: 'Return notes must be 5000 characters or fewer.' });
  if (payload.damageAmount !== undefined && String(payload.damageAmount) !== '0' && String(payload.damageAmount) !== '0.00') errors.push({ field: 'damageAmount', message: 'Damage amounts are not editable in this workflow.' });
  if (payload.lateFeeAmount !== undefined && String(payload.lateFeeAmount) !== '0' && String(payload.lateFeeAmount) !== '0.00') errors.push({ field: 'lateFeeAmount', message: 'Late fees are not calculated in this workflow.' });
  return errors;
};

export const validateReturnListQuery = (query = {}) => {
  const errors = [];
  if (query.customerId && !isPositiveId(query.customerId)) errors.push({ field: 'customerId', message: 'customerId must be a positive integer.' });
  if (query.bookingId && !isPositiveId(query.bookingId)) errors.push({ field: 'bookingId', message: 'bookingId must be a positive integer.' });
  for (const field of ['startDate', 'endDate']) if (query[field] && !isBusinessDate(query[field])) errors.push({ field, message: `${field} must be a valid YYYY-MM-DD date.` });
  if (query.startDate && query.endDate && query.endDate < query.startDate) errors.push({ field: 'dateRange', message: 'endDate must not precede startDate.' });
  if (query.status && !['PARTIAL', 'COMPLETED', 'ON_TIME', 'LATE'].includes(String(query.status).toUpperCase())) errors.push({ field: 'status', message: 'Return status is not supported.' });
  if (query.damageStatus && !RETURN_DAMAGE_STATUSES.includes(String(query.damageStatus).toUpperCase())) errors.push({ field: 'damageStatus', message: 'Damage status is not supported.' });
  if (String(query.search || '').length > 150) errors.push({ field: 'search', message: 'Search must be 150 characters or fewer.' });
  if (query.sortBy && !['returnDate', 'createdAt'].includes(String(query.sortBy))) errors.push({ field: 'sortBy', message: 'Return sort field is not supported.' });
  if (query.sortOrder && !['asc', 'desc'].includes(String(query.sortOrder).toLowerCase())) errors.push({ field: 'sortOrder', message: 'sortOrder must be asc or desc.' });
  return errors;
};