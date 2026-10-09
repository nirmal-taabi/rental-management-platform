import AppError from '../utils/AppError.js';
import { BAD_REQUEST, NOT_FOUND } from '../constants/httpStatus.js';
import { pool } from '../config/database.js';
import { createAuditLog } from '../repositories/audit.repository.js';
import { findShopById } from '../repositories/shop.repository.js';
import {
  countPlatformBookings,
  countPlatformCustomers,
  countPlatformShops,
  countPlatformUsers,
  getPlatformOverview,
  getPlatformShopDetails,
  listPlatformBookings,
  listPlatformCustomers,
  listPlatformShops,
  listPlatformUsers,
  setPlatformShopStatus,
} from '../repositories/admin.repository.js';

const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const parseListOptions = (query, { sortFields, statuses = [], defaultSortBy }) => {
  const errors = [];
  const pageValue = query.page === undefined ? 1 : Number(query.page);
  const limitValue = query.limit === undefined ? 25 : Number(query.limit);
  const page = Math.floor(pageValue);
  const limit = Math.floor(limitValue);
  const search = String(query.search || '').trim();
  const status = String(query.status || '').trim().toLowerCase();
  const sortBy = String(query.sortBy || defaultSortBy);
  const sortOrder = String(query.sortOrder || 'desc').toLowerCase();
  const startDate = query.startDate ? String(query.startDate) : '';
  const endDate = query.endDate ? String(query.endDate) : '';
  const shopIdValue = query.shopId === undefined || query.shopId === '' ? null : Number(query.shopId);

  if (!Number.isSafeInteger(page) || page < 1) errors.push({ field: 'page', message: 'Page must be a positive integer.' });
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) errors.push({ field: 'limit', message: 'Limit must be between 1 and 100.' });
  if (search.length > 150) errors.push({ field: 'search', message: 'Search must be 150 characters or fewer.' });
  if (status && !statuses.includes(status)) errors.push({ field: 'status', message: 'Status filter is not supported.' });
  if (!sortFields.includes(sortBy)) errors.push({ field: 'sortBy', message: 'Sort field is not supported.' });
  if (!['asc', 'desc'].includes(sortOrder)) errors.push({ field: 'sortOrder', message: 'Sort order must be asc or desc.' });
  if (startDate && !validDate(startDate)) errors.push({ field: 'startDate', message: 'Start date must use YYYY-MM-DD.' });
  if (endDate && !validDate(endDate)) errors.push({ field: 'endDate', message: 'End date must use YYYY-MM-DD.' });
  if (startDate && endDate && endDate < startDate) errors.push({ field: 'dateRange', message: 'End date must not precede start date.' });
  if (shopIdValue !== null && (!Number.isSafeInteger(shopIdValue) || shopIdValue < 1)) {
    errors.push({ field: 'shopId', message: 'Shop ID must be a positive integer.' });
  }

  if (errors.length) {
    throw new AppError('Invalid platform admin query.', BAD_REQUEST, 'VALIDATION_ERROR', true, errors);
  }

  return {
    page,
    limit,
    search,
    status: status || null,
    sortBy,
    sortOrder,
    startDate: startDate || null,
    endDate: endDate || null,
    shopId: shopIdValue,
  };
};

const getPage = async (options, countRows, listRows) => {
  const [totalItems, data] = await Promise.all([countRows(options), listRows(options)]);
  const totalPages = Math.max(1, Math.ceil(totalItems / options.limit));
  return {
    data,
    pagination: {
      page: options.page,
      limit: options.limit,
      totalItems,
      totalPages,
      hasNextPage: options.page < totalPages,
      hasPreviousPage: options.page > 1,
    },
  };
};

export const getPlatformAdminOverview = async (query = {}) => {
  const days = Number(query.days === undefined ? 30 : query.days);
  if (![7, 30, 90].includes(days)) {
    throw new AppError('Overview range must be 7, 30, or 90 days.', BAD_REQUEST, 'VALIDATION_ERROR', true, [
      { field: 'days', message: 'Choose 7, 30, or 90 days.' },
    ]);
  }
  const result = await getPlatformOverview(days);
  return { days, ...result };
};

export const getPlatformShops = (query = {}) => {
  const options = parseListOptions(query, {
    sortFields: ['name', 'createdAt', 'status'],
    statuses: ['active', 'inactive', 'pending', 'suspended'],
    defaultSortBy: 'createdAt',
  });
  return getPage(options, countPlatformShops, listPlatformShops);
};

export const getPlatformShop = async (shopId) => {
  const id = Number(shopId);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError('Shop not found.', NOT_FOUND, 'SHOP_NOT_FOUND');
  }
  const shop = await getPlatformShopDetails(id);
  if (!shop) throw new AppError('Shop not found.', NOT_FOUND, 'SHOP_NOT_FOUND');
  return shop;
};

export const updatePlatformShopStatus = async (shopId, actorUserId, payload = {}, audit = {}) => {
  const id = Number(shopId);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new AppError('Shop not found.', NOT_FOUND, 'SHOP_NOT_FOUND');
  }
  const status = String(payload.status || '').trim().toLowerCase();
  const reason = String(payload.reason || '').trim();
  const errors = [];
  if (!['active', 'inactive', 'suspended'].includes(status)) {
    errors.push({ field: 'status', message: 'Status must be ACTIVE, INACTIVE, or SUSPENDED.' });
  }
  if (reason.length < 5 || reason.length > 500) {
    errors.push({ field: 'reason', message: 'Provide a reason between 5 and 500 characters.' });
  }
  if (errors.length) {
    throw new AppError('Invalid shop status update.', BAD_REQUEST, 'VALIDATION_ERROR', true, errors);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const currentShop = await findShopById(id, connection);
    if (!currentShop) throw new AppError('Shop not found.', NOT_FOUND, 'SHOP_NOT_FOUND');
    if (currentShop.status === status) {
      await connection.commit();
      return { id: currentShop.id, name: currentShop.name, status: currentShop.status };
    }
    const updatedShop = await setPlatformShopStatus(id, status, connection);
    await createAuditLog({
      ...audit,
      shopId: id,
      userId: actorUserId,
      entityType: 'shop',
      entityId: id,
      action: `PLATFORM_SHOP_${status.toUpperCase()}`,
      oldValues: { status: currentShop.status },
      newValues: { status, reason },
    }, connection);
    await connection.commit();
    return updatedShop;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getPlatformUsers = (query = {}) => {
  const options = parseListOptions(query, {
    sortFields: ['name', 'createdAt', 'status'],
    statuses: ['active', 'inactive', 'pending', 'locked'],
    defaultSortBy: 'createdAt',
  });
  const role = String(query.role || '').trim().toUpperCase();
  if (role && !['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'SUPER_ADMIN'].includes(role)) {
    throw new AppError('Invalid role filter.', BAD_REQUEST, 'VALIDATION_ERROR', true, [
      { field: 'role', message: 'Role filter is not supported.' },
    ]);
  }
  return getPage({ ...options, role: role || null }, countPlatformUsers, listPlatformUsers);
};

export const getPlatformCustomers = (query = {}) => {
  const options = parseListOptions(query, {
    sortFields: ['name', 'createdAt', 'status'],
    statuses: ['active', 'inactive', 'blacklisted'],
    defaultSortBy: 'createdAt',
  });
  return getPage(options, countPlatformCustomers, listPlatformCustomers);
};

export const getPlatformBookings = (query = {}) => {
  const options = parseListOptions(query, {
    sortFields: ['bookingDate', 'rentalStartDate', 'totalAmount'],
    statuses: ['draft', 'pending', 'confirmed', 'ready', 'active', 'completed', 'cancelled'],
    defaultSortBy: 'bookingDate',
  });
  if (options.status) options.status = options.status.toUpperCase();
  return getPage(options, countPlatformBookings, listPlatformBookings);
};
