import { pool } from '../config/database.js';
import { PAYMENT_STATUS_TRANSITIONS } from '../constants/payment.constants.js';
import { BAD_REQUEST, CONFLICT, NOT_FOUND } from '../constants/httpStatus.js';
import AppError from '../utils/AppError.js';
import { createAuditLog } from '../repositories/audit.repository.js';
import {
  cancelPaymentRecord,
  countBookingPayments,
  countCustomerPayments,
  countPaymentsByShop,
  createPaymentRecord,
  findBookingForPayment,
  findBookingPayments,
  findCustomerPayments,
  findPaymentBookingId,
  findPaymentById,
  findPaymentForUpdate,
  findPaymentsByShop,
  getCustomerPaymentSummary,
  getOutstandingBalanceByShop,
  getPaymentSummaryByShop,
  sumBookingPayments,
  updateBookingPaymentSnapshot,
  updatePaymentStatusRecord,
} from '../repositories/payment.repository.js';
import { getBookingPaymentSummary, summarizeBookingPayments } from './paymentCalculation.service.js';
import { fromCents, toCents } from '../utils/paymentMoney.js';
import {
  validateCancelPayment,
  validateCreatePayment,
  validatePaymentListQuery,
  validatePaymentStatus,
} from '../validators/payment.validator.js';

const throwValidation = (errors) => {
  if (errors.length) throw new AppError('Invalid payment data.', BAD_REQUEST, 'VALIDATION_ERROR', true, errors);
};

const parseId = (value, resource) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError(`${resource} not found.`, NOT_FOUND, `${resource.toUpperCase()}_NOT_FOUND`);
  return id;
};

const getListOptions = (query = {}) => {
  throwValidation(validatePaymentListQuery(query));
  const requestedPage = Number(query.page || 1);
  const requestedLimit = Number(query.limit || 20);
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, Math.floor(requestedLimit))) : 20;
  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search: String(query.search || '').trim(),
    status: String(query.status || '').trim().toUpperCase(),
    paymentMethod: String(query.paymentMethod || '').trim().toUpperCase(),
    paymentType: String(query.paymentType || '').trim().toUpperCase(),
    bookingId: query.bookingId ? Number(query.bookingId) : null,
    customerId: query.customerId ? Number(query.customerId) : null,
    startDate: query.startDate || null,
    endDate: query.endDate || null,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
};

const persistBookingSummary = async (shopId, bookingId, connection) => {
  const booking = await findBookingForPayment(shopId, bookingId, connection, true);
  if (!booking) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
  const totals = await sumBookingPayments(shopId, bookingId, connection);
  const summary = summarizeBookingPayments(booking, totals);
  await updateBookingPaymentSnapshot(shopId, bookingId, summary.netPaid, summary.balanceAmount, connection);
  return summary;
};

export const createPaymentForShop = async (shopId, userId, payload = {}, audit = {}) => {
  throwValidation(validateCreatePayment(payload));
  const amountCents = toCents(payload.amount);
  const amount = fromCents(amountCents);
  const normalized = {
    ...payload,
    bookingId: Number(payload.bookingId),
    paymentMethod: String(payload.paymentMethod).toUpperCase(),
    paymentType: String(payload.paymentType).toUpperCase(),
    notes: String(payload.notes || '').trim(),
  };
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const booking = await findBookingForPayment(shopId, normalized.bookingId, connection, true);
    if (!booking) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
    if (['DRAFT', 'CANCELLED'].includes(String(booking.status).toUpperCase())) {
      throw new AppError('Payments cannot be recorded for this booking state.', CONFLICT, 'BOOKING_PAYMENT_NOT_ALLOWED');
    }
    const totals = await sumBookingPayments(shopId, booking.id, connection);
    const summary = summarizeBookingPayments(booking, totals);
    const remainingCents = toCents(summary.balanceAmount);
    if (amountCents > remainingCents) {
      throw new AppError('Payment amount exceeds the remaining balance.', CONFLICT, 'PAYMENT_AMOUNT_EXCEEDS_BALANCE', true, {
        remainingBalance: summary.balanceAmount,
      });
    }
    const paymentId = await createPaymentRecord(shopId, userId, booking, normalized, amount, connection);
    const updatedSummary = await persistBookingSummary(shopId, booking.id, connection);
    const payment = await findPaymentById(shopId, paymentId, connection);
    payment.bookingPaymentSummary = updatedSummary;
    await createAuditLog({
      ...audit,
      shopId,
      entityType: 'payment',
      entityId: paymentId,
      action: 'CREATE_PAYMENT',
      newValues: payment,
    }, connection);
    await createAuditLog({
      ...audit,
      shopId,
      entityType: 'payment',
      entityId: paymentId,
      action: 'PAYMENT_RECORDED',
      newValues: { bookingId: booking.id, paymentReference: payment.paymentReference, amount, paymentType: normalized.paymentType },
    }, connection);
    await connection.commit();
    return payment;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const listPaymentsForShop = async (shopId, query = {}) => {
  const options = getListOptions(query);
  const [totalItems, data, summary, outstanding] = await Promise.all([
    countPaymentsByShop(shopId, options),
    findPaymentsByShop(shopId, options),
    getPaymentSummaryByShop(shopId, options),
    getOutstandingBalanceByShop(shopId),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / options.limit));
  return {
    data,
    summary: { ...summary, outstanding },
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

export const getPaymentForShop = async (shopId, paymentId) => {
  const payment = await findPaymentById(shopId, parseId(paymentId, 'Payment'));
  if (!payment) throw new AppError('Payment not found.', NOT_FOUND, 'PAYMENT_NOT_FOUND');
  if (payment.bookingId) payment.bookingPaymentSummary = await getBookingPaymentSummary(shopId, payment.bookingId);
  return payment;
};

export const getBookingPaymentHistoryForShop = async (shopId, bookingId, query = {}) => {
  const id = parseId(bookingId, 'Booking');
  const booking = await findBookingForPayment(shopId, id);
  if (!booking) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
  const options = getListOptions({ ...query, bookingId: id });
  const [totalItems, data, paymentSummary] = await Promise.all([
    countBookingPayments(shopId, id, options),
    findBookingPayments(shopId, id, options),
    getBookingPaymentSummary(shopId, id),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / options.limit));
  return {
    data,
    paymentSummary,
    pagination: { page: options.page, limit: options.limit, totalItems, totalPages, hasNextPage: options.page < totalPages, hasPreviousPage: options.page > 1 },
  };
};

export const getCustomerPaymentHistoryForShop = async (shopId, customerId, query = {}) => {
  const id = parseId(customerId, 'Customer');
  const options = getListOptions({ ...query, customerId: id });
  const [totalItems, data, summary] = await Promise.all([
    countCustomerPayments(shopId, id, options),
    findCustomerPayments(shopId, id, options),
    getCustomerPaymentSummary(shopId, id),
  ]);
  if (!summary.customerExists) {
    throw new AppError('Customer not found.', NOT_FOUND, 'CUSTOMER_NOT_FOUND');
  }
  const totalPages = Math.max(1, Math.ceil(totalItems / options.limit));
  return { data, summary, pagination: { page: options.page, limit: options.limit, totalItems, totalPages, hasNextPage: options.page < totalPages, hasPreviousPage: options.page > 1 } };
};

export const getPaymentSummaryForShop = async (shopId, query = {}) => {
  const options = getListOptions({ ...query, page: 1, limit: 1 });
  const summary = await getPaymentSummaryByShop(shopId, options);
  return summary;
};

export const cancelPaymentForShop = async (shopId, paymentId, userId, payload = {}, audit = {}) => {
  throwValidation(validateCancelPayment(payload));
  const id = parseId(paymentId, 'Payment');
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const bookingId = await findPaymentBookingId(shopId, id, connection);
    if (!bookingId) throw new AppError('Payment not found.', NOT_FOUND, 'PAYMENT_NOT_FOUND');
    const booking = await findBookingForPayment(shopId, bookingId, connection, true);
    if (!booking) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
    const payment = await findPaymentForUpdate(shopId, id, connection);
    if (!payment) throw new AppError('Payment not found.', NOT_FOUND, 'PAYMENT_NOT_FOUND');
    const currentStatus = String(payment.status).toUpperCase();
    if (!['SUCCESS', 'PENDING'].includes(currentStatus)) {
      throw new AppError('Only successful or pending payments can be cancelled.', CONFLICT, 'PAYMENT_NOT_CANCELLABLE');
    }
    await cancelPaymentRecord(shopId, id, userId, String(payload.reason).trim(), connection);
    const paymentSummary = await persistBookingSummary(shopId, bookingId, connection);
    const updatedPayment = await findPaymentById(shopId, id, connection);
    updatedPayment.bookingPaymentSummary = paymentSummary;
    await createAuditLog({
      ...audit,
      shopId,
      entityType: 'payment',
      entityId: id,
      action: 'CANCEL_PAYMENT',
      oldValues: { status: currentStatus },
      newValues: { status: 'CANCELLED', reason: payload.reason, paymentSummary },
    }, connection);
    await createAuditLog({
      ...audit,
      shopId,
      entityType: 'payment',
      entityId: id,
      action: 'PAYMENT_CANCELLED',
      oldValues: { status: currentStatus },
      newValues: { status: 'CANCELLED', reason: payload.reason },
    }, connection);
    await connection.commit();
    return updatedPayment;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const changePaymentStatusForShop = async (shopId, paymentId, nextStatus, audit = {}) => {
  if (!validatePaymentStatus(nextStatus)) {
    throw new AppError('Invalid payment status.', BAD_REQUEST, 'VALIDATION_ERROR', true, [{ field: 'status', message: 'Payment status is not supported.' }]);
  }
  const id = parseId(paymentId, 'Payment');
  const status = String(nextStatus).toUpperCase();
  if (!['SUCCESS', 'FAILED'].includes(status)) {
    throw new AppError('Use the controlled payment cancellation workflow for this status.', BAD_REQUEST, 'PAYMENT_STATUS_TRANSITION_INVALID');
  }
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const bookingId = await findPaymentBookingId(shopId, id, connection);
    if (!bookingId) throw new AppError('Payment not found.', NOT_FOUND, 'PAYMENT_NOT_FOUND');
    const booking = await findBookingForPayment(shopId, bookingId, connection, true);
    if (!booking) throw new AppError('Booking not found.', NOT_FOUND, 'BOOKING_NOT_FOUND');
    const payment = await findPaymentForUpdate(shopId, id, connection);
    if (!payment) throw new AppError('Payment not found.', NOT_FOUND, 'PAYMENT_NOT_FOUND');
    const currentStatus = String(payment.status).toUpperCase();
    if (!PAYMENT_STATUS_TRANSITIONS[currentStatus]?.includes(status)) {
      throw new AppError(`Cannot transition payment from ${currentStatus} to ${status}.`, CONFLICT, 'PAYMENT_STATUS_TRANSITION_INVALID');
    }
    if (status === 'SUCCESS') {
      const currentSummary = summarizeBookingPayments(booking, await sumBookingPayments(shopId, bookingId, connection));
      const remainingCents = toCents(currentSummary.balanceAmount);
      if (toCents(payment.amount) > remainingCents) {
        throw new AppError('Payment amount exceeds the remaining balance.', CONFLICT, 'PAYMENT_AMOUNT_EXCEEDS_BALANCE', true, { remainingBalance: currentSummary.balanceAmount });
      }
    }
    await updatePaymentStatusRecord(shopId, id, status, connection);
    const paymentSummary = await persistBookingSummary(shopId, bookingId, connection);
    const updatedPayment = await findPaymentById(shopId, id, connection);
    updatedPayment.bookingPaymentSummary = paymentSummary;
    await createAuditLog({
      ...audit,
      shopId,
      entityType: 'payment',
      entityId: id,
      action: 'PAYMENT_STATUS_CHANGE',
      oldValues: { status: currentStatus },
      newValues: { status, paymentSummary },
    }, connection);
    await connection.commit();
    return updatedPayment;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
