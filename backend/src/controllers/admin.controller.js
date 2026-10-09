import { sendSuccess } from '../utils/apiResponse.js';
import { OK } from '../constants/httpStatus.js';
import {
  getPlatformAdminOverview,
  getPlatformBookings,
  getPlatformCustomers,
  getPlatformShop,
  getPlatformShops,
  getPlatformUsers,
  updatePlatformShopStatus,
} from '../services/admin.service.js';

export const getOverview = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Platform overview retrieved.', await getPlatformAdminOverview(req.query), OK);
  } catch (error) {
    return next(error);
  }
};

export const getShops = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Platform shops retrieved.', await getPlatformShops(req.query), OK);
  } catch (error) {
    return next(error);
  }
};

export const getShop = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Platform shop details retrieved.', await getPlatformShop(req.params.shopId), OK);
  } catch (error) {
    return next(error);
  }
};

export const updateShopStatus = async (req, res, next) => {
  try {
    const shop = await updatePlatformShopStatus(req.params.shopId, req.user.id, req.body, {
      ipAddress: req.ip,
    });
    return sendSuccess(res, 'Platform shop status updated.', shop, OK);
  } catch (error) {
    return next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Platform users retrieved.', await getPlatformUsers(req.query), OK);
  } catch (error) {
    return next(error);
  }
};

export const getCustomers = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Platform customers retrieved.', await getPlatformCustomers(req.query), OK);
  } catch (error) {
    return next(error);
  }
};

export const getBookings = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Platform bookings retrieved.', await getPlatformBookings(req.query), OK);
  } catch (error) {
    return next(error);
  }
};
