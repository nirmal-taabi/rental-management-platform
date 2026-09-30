import { INVENTORY_CONDITIONS, INVENTORY_STATUSES } from '../constants/inventory.constants.js';

const pushError = (errors, field, message) => errors.push({ field, message });

const validDate = (value) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const validateInventoryInput = (payload = {}, { partial = false } = {}) => {
  const errors = [];
  const productId = Number(payload.productId);
  const sku = String(payload.sku || '').trim();
  const barcode = String(payload.barcode || '').trim();
  const qrCode = String(payload.qrCode || '').trim();
  const size = String(payload.size || '').trim();
  const color = String(payload.color || '').trim();
  const notes = String(payload.notes || '').trim();
  const condition = String(payload.condition || 'GOOD').trim().toUpperCase();

  if (!partial || payload.productId !== undefined) {
    if (!Number.isSafeInteger(productId) || productId < 1) pushError(errors, 'productId', 'Select a valid product.');
  }
  if (!partial || payload.sku !== undefined) {
    if (sku.length < 2 || sku.length > 80 || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(sku)) {
      pushError(errors, 'sku', 'Inventory SKU must be 2-80 characters using letters, numbers, dots, underscores, or hyphens.');
    }
  }
  if (barcode.length > 100) pushError(errors, 'barcode', 'Barcode must be 100 characters or fewer.');
  if (qrCode.length > 500) pushError(errors, 'qrCode', 'QR code reference must be 500 characters or fewer.');
  if (size.length > 50) pushError(errors, 'size', 'Size must be 50 characters or fewer.');
  if (color.length > 50) pushError(errors, 'color', 'Color must be 50 characters or fewer.');
  if (notes.length > 5000) pushError(errors, 'notes', 'Notes must be 5000 characters or fewer.');
  if (payload.condition !== undefined || !partial) {
    if (!INVENTORY_CONDITIONS.includes(condition)) pushError(errors, 'condition', 'Condition must be EXCELLENT, GOOD, FAIR, or DAMAGED.');
  }
  if (payload.purchaseDate !== undefined && !validDate(payload.purchaseDate)) {
    pushError(errors, 'purchaseDate', 'Purchase date must be a valid date in YYYY-MM-DD format.');
  }

  return { isValid: errors.length === 0, errors };
};

export const validateInventoryStatus = (payload = {}) => {
  const errors = [];
  const status = String(payload.status || '').trim().toUpperCase();
  if (!INVENTORY_STATUSES.includes(status)) pushError(errors, 'status', 'Status is not supported.');
  return { isValid: errors.length === 0, errors };
};

export const validateInventoryCondition = (payload = {}) => {
  const errors = [];
  const condition = String(payload.condition || '').trim().toUpperCase();
  if (!INVENTORY_CONDITIONS.includes(condition)) pushError(errors, 'condition', 'Condition must be EXCELLENT, GOOD, FAIR, or DAMAGED.');
  return { isValid: errors.length === 0, errors };
};