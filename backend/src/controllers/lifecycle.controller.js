import { CREATED, OK } from '../constants/httpStatus.js';
import { sendSuccess } from '../utils/apiResponse.js';
import {
  confirmBookingPickup,
  getBookingPickupForShop,
  getBookingReturnHistoryForShop,
  getInventoryReturnHistoryForShop,
  getReturnForShop,
  listReturnsForShop,
  recordBookingReturn,
} from '../services/lifecycle.service.js';

const auditContext = (req) => ({ userId: req.user.id, ipAddress: req.ip });

export const confirmPickup = async (req, res, next) => {
  try {
    const pickup = await confirmBookingPickup(req.user.shopId, req.params.id, req.user.id, req.body, auditContext(req));
    return sendSuccess(res, 'Pickup confirmed successfully.', pickup, CREATED);
  } catch (error) {
    return next(error);
  }
};

export const getPickup = async (req, res, next) => {
  try {
    const pickup = await getBookingPickupForShop(req.user.shopId, req.params.id);
    return sendSuccess(res, 'Pickup retrieved successfully.', pickup, OK);
  } catch (error) {
    return next(error);
  }
};

export const createBookingReturn = async (req, res, next) => {
  try {
    const result = await recordBookingReturn(req.user.shopId, req.params.id, req.user.id, req.body, auditContext(req));
    return sendSuccess(res, 'Return recorded successfully.', result, CREATED);
  } catch (error) {
    return next(error);
  }
};

export const getReturns = async (req, res, next) => {
  try {
    const result = await listReturnsForShop(req.user.shopId, req.query);
    return res.status(OK).json({ success: true, message: 'Returns retrieved successfully.', ...result });
  } catch (error) {
    return next(error);
  }
};

export const getReturn = async (req, res, next) => {
  try {
    const result = await getReturnForShop(req.user.shopId, req.params.id);
    return sendSuccess(res, 'Return retrieved successfully.', result, OK);
  } catch (error) {
    return next(error);
  }
};

export const getBookingReturns = async (req, res, next) => {
  try {
    const result = await getBookingReturnHistoryForShop(req.user.shopId, req.params.id, req.query);
    return res.status(OK).json({ success: true, message: 'Booking return history retrieved successfully.', ...result });
  } catch (error) {
    return next(error);
  }
};

export const getInventoryReturns = async (req, res, next) => {
  try {
    const result = await getInventoryReturnHistoryForShop(req.user.shopId, req.params.id, req.query);
    return res.status(OK).json({ success: true, message: 'Inventory return history retrieved successfully.', ...result });
  } catch (error) {
    return next(error);
  }
};