import { sendSuccess } from '../utils/apiResponse.js';
import { CREATED, OK } from '../constants/httpStatus.js';
import {
  cancelPaymentForShop,
  changePaymentStatusForShop,
  createPaymentForShop,
  getBookingPaymentHistoryForShop,
  getCustomerPaymentHistoryForShop,
  getPaymentForShop,
  getPaymentSummaryForShop,
  listPaymentsForShop,
} from '../services/payment.service.js';

const auditContext = (req) => ({ userId: req.user.id, ipAddress: req.ip });

export const getPayments = async (req, res, next) => {
  try {
    const result = await listPaymentsForShop(req.user.shopId, req.query);
    return res.status(OK).json({ success: true, message: 'Payments retrieved successfully.', ...result });
  } catch (error) {
    return next(error);
  }
};

export const getPaymentSummary = async (req, res, next) => {
  try {
    const summary = await getPaymentSummaryForShop(req.user.shopId, req.query);
    return sendSuccess(res, 'Payment summary retrieved successfully.', summary, OK);
  } catch (error) {
    return next(error);
  }
};

export const getPayment = async (req, res, next) => {
  try {
    const payment = await getPaymentForShop(req.user.shopId, req.params.id);
    return sendSuccess(res, 'Payment retrieved successfully.', payment, OK);
  } catch (error) {
    return next(error);
  }
};

export const createPayment = async (req, res, next) => {
  try {
    const payment = await createPaymentForShop(req.user.shopId, req.user.id, req.body, auditContext(req));
    return sendSuccess(res, 'Payment recorded successfully.', payment, CREATED);
  } catch (error) {
    return next(error);
  }
};

export const cancelPayment = async (req, res, next) => {
  try {
    const payment = await cancelPaymentForShop(req.user.shopId, req.params.id, req.user.id, req.body, auditContext(req));
    return sendSuccess(res, 'Payment cancelled successfully.', payment, OK);
  } catch (error) {
    return next(error);
  }
};

export const changePaymentStatus = async (req, res, next) => {
  try {
    const payment = await changePaymentStatusForShop(req.user.shopId, req.params.id, req.body.status, auditContext(req));
    return sendSuccess(res, 'Payment status updated successfully.', payment, OK);
  } catch (error) {
    return next(error);
  }
};

export const getBookingPayments = async (req, res, next) => {
  try {
    const result = await getBookingPaymentHistoryForShop(req.user.shopId, req.params.id, req.query);
    return res.status(OK).json({ success: true, message: 'Booking payments retrieved successfully.', ...result });
  } catch (error) {
    return next(error);
  }
};

export const getCustomerPayments = async (req, res, next) => {
  try {
    const result = await getCustomerPaymentHistoryForShop(req.user.shopId, req.params.id, req.query);
    return res.status(OK).json({ success: true, message: 'Customer payments retrieved successfully.', ...result });
  } catch (error) {
    return next(error);
  }
};