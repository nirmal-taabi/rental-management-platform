import AppError from '../utils/AppError.js';
import { BAD_REQUEST } from '../constants/httpStatus.js';
import {
  getDashboardActivity,
  getDashboardAttention,
  getDashboardOperations,
  getDashboardSummary,
} from '../repositories/dashboard.repository.js';
import { validateReportRange } from '../validators/report.validator.js';

const businessDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
};

const getPreviousRange = ({ startDate, endDate }) => {
  const days = Math.floor((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000) + 1;
  const previousEnd = new Date(Date.parse(`${startDate}T00:00:00Z`) - 86_400_000);
  const previousStart = new Date(previousEnd.getTime() - ((days - 1) * 86_400_000));
  return {
    previousStartDate: previousStart.toISOString().slice(0, 10),
    previousEndDate: previousEnd.toISOString().slice(0, 10),
  };
};

export const getDashboardSummaryForShop = async (shopId, query, role) => {
  const range = validateReportRange(query);
  if (range.errors.length) throw new AppError('Invalid dashboard date range.', BAD_REQUEST, 'VALIDATION_ERROR', true, range.errors);
  return getDashboardSummary(shopId, { ...range, ...getPreviousRange(range), includeFinancials: role !== 'STAFF' });
};

export const getDashboardOperationsForShop = (shopId) => getDashboardOperations(shopId, businessDate());

export const getDashboardAttentionForShop = (shopId, role) =>
  getDashboardAttention(shopId, businessDate(), role !== 'STAFF');

export const getDashboardActivityForShop = (shopId) => getDashboardActivity(shopId);