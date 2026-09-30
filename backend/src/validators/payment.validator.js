import { PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_TYPES } from '../constants/payment.constants.js';
import { isBusinessDate } from '../utils/availabilityDate.js';
import { toCents } from '../utils/paymentMoney.js';

const isPositiveId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;

export const validateCreatePayment = (payload = {}) => {
  const errors = [];
  if (!isPositiveId(payload.bookingId)) errors.push({ field: 'bookingId', message: 'A valid booking is required.' });
  const amountCents = toCents(payload.amount);
  if (amountCents === null || amountCents <= 0) errors.push({ field: 'amount', message: 'Amount must be greater than zero and have at most two decimal places.' });
  if (!PAYMENT_TYPES.includes(String(payload.paymentType || '').toUpperCase())) errors.push({ field: 'paymentType', message: 'Payment type is not supported.' });
  if (!PAYMENT_METHODS.includes(String(payload.paymentMethod || '').toUpperCase())) errors.push({ field: 'paymentMethod', message: 'Payment method is not supported.' });
  if (!isBusinessDate(payload.transactionDate)) errors.push({ field: 'transactionDate', message: 'Transaction date must be a valid YYYY-MM-DD date.' });
  if (payload.notes !== undefined && String(payload.notes).length > 2000) errors.push({ field: 'notes', message: 'Notes must be 2000 characters or fewer.' });
  return errors;
};

export const validatePaymentListQuery = (query = {}) => {
  const errors = [];
  if (query.status && !PAYMENT_STATUSES.includes(String(query.status).toUpperCase())) errors.push({ field: 'status', message: 'Payment status is not supported.' });
  if (query.paymentMethod && !PAYMENT_METHODS.includes(String(query.paymentMethod).toUpperCase())) errors.push({ field: 'paymentMethod', message: 'Payment method is not supported.' });
  if (query.paymentType && !PAYMENT_TYPES.includes(String(query.paymentType).toUpperCase())) errors.push({ field: 'paymentType', message: 'Payment type is not supported.' });
  for (const field of ['bookingId', 'customerId']) {
    if (query[field] && !isPositiveId(query[field])) errors.push({ field, message: `${field} must be a positive integer.` });
  }
  if (query.startDate && !isBusinessDate(query.startDate)) errors.push({ field: 'startDate', message: 'startDate must be a valid YYYY-MM-DD date.' });
  if (query.endDate && !isBusinessDate(query.endDate)) errors.push({ field: 'endDate', message: 'endDate must be a valid YYYY-MM-DD date.' });
  if (query.startDate && query.endDate && query.endDate < query.startDate) errors.push({ field: 'dateRange', message: 'endDate must not precede startDate.' });
  if (String(query.search || '').length > 150) errors.push({ field: 'search', message: 'Search must be 150 characters or fewer.' });
  return errors;
};

export const validateCancelPayment = (payload = {}) => {
  const reason = String(payload.reason || '').trim();
  return reason.length < 3 || reason.length > 500
    ? [{ field: 'reason', message: 'Cancellation reason must be between 3 and 500 characters.' }]
    : [];
};

export const validatePaymentStatus = (status) => PAYMENT_STATUSES.includes(String(status || '').toUpperCase());