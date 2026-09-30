const NAME_MAX = 180;
const CATEGORY_NAME_MAX = 120;
const DESCRIPTION_MAX = 5000;
const SKU_REGEX = /^[A-Z0-9][A-Z0-9_-]{1,99}$/;
const PRICE_REGEX = /^\d{1,10}(?:\.\d{1,2})?$/;

const pushError = (errors, field, message) => errors.push({ field, message });

export const validateCategoryInput = (payload = {}) => {
  const errors = [];
  const name = String(payload.name || '').trim();
  const description = String(payload.description || '').trim();

  if (name.length < 2 || name.length > CATEGORY_NAME_MAX) {
    pushError(errors, 'name', 'Category name must be 2-120 characters long.');
  }
  if (description.length > 500) {
    pushError(errors, 'description', 'Description must be 500 characters or fewer.');
  }

  return { isValid: errors.length === 0, errors };
};

export const validateCategoryStatus = (payload = {}) => {
  const errors = [];
  if (!['ACTIVE', 'INACTIVE'].includes(String(payload.status || '').trim().toUpperCase())) {
    pushError(errors, 'status', 'Status must be ACTIVE or INACTIVE.');
  }
  return { isValid: errors.length === 0, errors };
};

export const validateProductInput = (payload = {}) => {
  const errors = [];
  const categoryId = Number(payload.categoryId);
  const name = String(payload.name || '').trim();
  const sku = String(payload.sku || '').trim().toUpperCase();
  const brand = String(payload.brand || '').trim();
  const productType = String(payload.productType || 'GARMENT').trim().toUpperCase();
  const description = String(payload.description || '').trim();
  const rentalPrice = String(payload.rentalPrice ?? '').trim();
  const depositAmount = String(payload.depositAmount ?? '0').trim();

  if (!Number.isSafeInteger(categoryId) || categoryId < 1) {
    pushError(errors, 'categoryId', 'A valid category is required.');
  }
  if (name.length < 2 || name.length > NAME_MAX) {
    pushError(errors, 'name', 'Product name must be 2-180 characters long.');
  }
  if (!SKU_REGEX.test(sku)) {
    pushError(errors, 'sku', 'SKU must be 2-100 characters using letters, numbers, hyphens, or underscores.');
  }
  if (brand.length > 120) {
    pushError(errors, 'brand', 'Brand must be 120 characters or fewer.');
  }
  if (!['GARMENT', 'EQUIPMENT', 'ACCESSORY', 'OTHER'].includes(productType)) {
    pushError(errors, 'productType', 'Product type must be GARMENT, EQUIPMENT, ACCESSORY, or OTHER.');
  }
  if (description.length > DESCRIPTION_MAX) {
    pushError(errors, 'description', 'Description must be 5000 characters or fewer.');
  }
  if (!PRICE_REGEX.test(rentalPrice)) {
    pushError(errors, 'rentalPrice', 'Rental price must be a non-negative amount with up to 2 decimal places.');
  }
  if (!PRICE_REGEX.test(depositAmount)) {
    pushError(errors, 'depositAmount', 'Security deposit must be a non-negative amount with up to 2 decimal places.');
  }

  return { isValid: errors.length === 0, errors };
};

export const validateProductStatus = (payload = {}) => {
  const errors = [];
  if (!['ACTIVE', 'INACTIVE'].includes(String(payload.status || '').trim().toUpperCase())) {
    pushError(errors, 'status', 'Status must be ACTIVE or INACTIVE.');
  }
  return { isValid: errors.length === 0, errors };
};