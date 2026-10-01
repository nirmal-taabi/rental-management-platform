import AppError from '../utils/AppError.js';
import { BAD_REQUEST } from '../constants/httpStatus.js';
import {
  getBookingStatusReport,
  getBookingTrend,
  getBookingsForExport,
  getCategoryReport,
  getCustomerReport,
  getInventoryDamage,
  getInventoryReport,
  getLateReturns,
  getPaymentReport,
  getReturnReport,
  getTopProducts,
} from '../repositories/report.repository.js';
import { validateReportLimit, validateReportRange } from '../validators/report.validator.js';

const getValidatedRange = (query) => {
  const range = validateReportRange(query);
  if (range.errors.length) {
    throw new AppError('Invalid report query.', BAD_REQUEST, 'VALIDATION_ERROR', true, range.errors);
  }
  return range;
};

export const getBookingTrendForShop = (shopId, query) => getBookingTrend(shopId, getValidatedRange(query));
export const getBookingStatusesForShop = (shopId, query) => getBookingStatusReport(shopId, getValidatedRange(query));
export const getInventoryReportForShop = (shopId) => getInventoryReport(shopId);
export const getPaymentReportForShop = (shopId, query) => getPaymentReport(shopId, getValidatedRange(query));
export const getCategoryReportForShop = (shopId, query) => getCategoryReport(shopId, getValidatedRange(query));
export const getReturnReportForShop = (shopId, query) => getReturnReport(shopId, getValidatedRange(query));
export const getLateReturnsForShop = (shopId, query) => getLateReturns(shopId, getValidatedRange(query));
export const getInventoryDamageForShop = (shopId, query) => getInventoryDamage(shopId, getValidatedRange(query));

export const getTopProductsForShop = (shopId, query) => {
  const range = getValidatedRange(query);
  const { value: limit, error } = validateReportLimit(query.limit, 10);
  if (error) throw new AppError('Invalid report query.', BAD_REQUEST, 'VALIDATION_ERROR', true, [error]);
  return getTopProducts(shopId, range, limit);
};

export const getCustomerReportForShop = (shopId, query, role) =>
  getCustomerReport(shopId, getValidatedRange(query), role !== 'STAFF');

export const getBookingExportForShop = (shopId, query, role) =>
  getBookingsForExport(shopId, getValidatedRange(query), role !== 'STAFF');