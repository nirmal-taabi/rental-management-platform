import AppError from '../utils/AppError.js';
import { createHash } from 'node:crypto';
import { BAD_REQUEST, CONFLICT, NOT_FOUND } from '../constants/httpStatus.js';
import {
  countCategoriesByShop,
  createCategoryRecord,
  findCategoriesByShop,
  findCategoryById,
  findCategoryByName,
  updateCategoryRecord,
  updateCategoryStatusRecord,
} from '../repositories/category.repository.js';
import { validateCategoryInput, validateCategoryStatus } from '../validators/catalog.validator.js';

const normalizeCategory = (payload = {}) => ({
  name: String(payload.name || '').trim(),
  description: String(payload.description || '').trim(),
});

const slugify = (value) => {
  const normalized = String(value).normalize('NFKC').trim().toLocaleLowerCase('en');
  return `category-${createHash('sha256').update(normalized).digest('hex')}`;
};

const translateDuplicateName = (error) => {
  if (error.code === 'ER_DUP_ENTRY') {
    throw new AppError('A category with this name already exists in this shop.', CONFLICT, 'CATEGORY_NAME_EXISTS');
  }
  throw error;
};

const validate = (payload) => {
  const result = validateCategoryInput(payload);
  if (!result.isValid) {
    throw new AppError('Invalid category data.', BAD_REQUEST, 'VALIDATION_ERROR', true, result.errors);
  }
};

export const getCategoriesForShop = async (shopId, query = {}) => {
  const requestedPage = Number(query.page || 1);
  const requestedLimit = Number(query.limit || 100);
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.floor(requestedLimit))) : 100;
  const options = {
    page,
    limit,
    search: String(query.search || '').trim(),
    status: ['ACTIVE', 'INACTIVE'].includes(String(query.status || '').toUpperCase()) ? String(query.status).toLowerCase() : '',
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
  const totalItems = await countCategoriesByShop(shopId, options);
  const data = await findCategoriesByShop(shopId, options);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    data,
    pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
  };
};

export const getCategoryForShop = async (shopId, categoryId) => {
  const category = await findCategoryById(shopId, categoryId);
  if (!category) throw new AppError('Category not found.', NOT_FOUND, 'CATEGORY_NOT_FOUND');
  return category;
};

export const createCategoryForShop = async (shopId, payload, audit) => {
  const normalized = normalizeCategory(payload);
  validate(normalized);
  const slug = slugify(normalized.name);
  if (await findCategoryByName(shopId, normalized.name)) {
    throw new AppError('A category with this name already exists in this shop.', CONFLICT, 'CATEGORY_NAME_EXISTS');
  }
  try {
    return await createCategoryRecord(shopId, { ...normalized, slug }, audit);
  } catch (error) {
    return translateDuplicateName(error);
  }
};

export const updateCategoryForShop = async (shopId, categoryId, payload, audit) => {
  const existing = await findCategoryById(shopId, categoryId);
  if (!existing) throw new AppError('Category not found.', NOT_FOUND, 'CATEGORY_NOT_FOUND');
  const normalized = normalizeCategory(payload);
  validate(normalized);
  const slug = slugify(normalized.name);
  if (await findCategoryByName(shopId, normalized.name, categoryId)) {
    throw new AppError('A category with this name already exists in this shop.', CONFLICT, 'CATEGORY_NAME_EXISTS');
  }
  try {
    return await updateCategoryRecord(shopId, categoryId, { ...normalized, slug }, audit);
  } catch (error) {
    return translateDuplicateName(error);
  }
};

export const updateCategoryStatusForShop = async (shopId, categoryId, payload, audit) => {
  const validation = validateCategoryStatus(payload);
  if (!validation.isValid) {
    throw new AppError('Invalid category status.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
  }
  const existing = await findCategoryById(shopId, categoryId);
  if (!existing) throw new AppError('Category not found.', NOT_FOUND, 'CATEGORY_NOT_FOUND');
  const updated = await updateCategoryStatusRecord(shopId, categoryId, String(payload.status).toUpperCase(), audit);
  if (!updated) throw new AppError('Category not found.', NOT_FOUND, 'CATEGORY_NOT_FOUND');
  return updated;
};