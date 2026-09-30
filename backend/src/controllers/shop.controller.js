import AppError from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import {
  createShopForUser,
  getShopForUser,
  getShopMembershipsForUser,
  switchShopForUser,
  updateShopForMembership,
  updateShopStatusForUser,
  updateShopForUser,
} from '../services/shop.service.js';
import { validateShopCreateInput, validateShopStatusInput, validateShopUpdateInput } from '../validators/shop.validator.js';
import { BAD_REQUEST, CREATED, OK } from '../constants/httpStatus.js';

const auditContext = (req) => ({ userId: req.user.id, ipAddress: req.ip });

export const getShops = async (req, res, next) => {
  try {
    const shops = await getShopMembershipsForUser(req.user.id);
    return sendSuccess(res, 'Shops retrieved successfully.', shops, OK);
  } catch (error) {
    return next(error);
  }
};

export const createShop = async (req, res, next) => {
  try {
    const validation = validateShopCreateInput(req.body);
    if (!validation.isValid) {
      throw new AppError('Invalid shop creation data.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
    }

    const shop = await createShopForUser(req.user.id, req.body, auditContext(req));
    return sendSuccess(res, 'Shop created successfully.', shop, CREATED);
  } catch (error) {
    return next(error);
  }
};

export const switchShop = async (req, res, next) => {
  try {
    const currentShop = await switchShopForUser(req.user.id, req.params.shopId);
    return sendSuccess(res, 'Shop switched successfully.', { currentShop }, OK);
  } catch (error) {
    return next(error);
  }
};

export const updateShopStatus = async (req, res, next) => {
  try {
    const validation = validateShopStatusInput(req.body);
    if (!validation.isValid) {
      throw new AppError('Invalid shop status.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
    }

    const shop = await updateShopStatusForUser(req.user.id, req.params.shopId, req.body.status, auditContext(req));
    return sendSuccess(res, 'Shop status updated successfully.', shop, OK);
  } catch (error) {
    return next(error);
  }
};

export const updateMemberShop = async (req, res, next) => {
  try {
    const validation = validateShopUpdateInput(req.body);
    if (!validation.isValid) {
      throw new AppError('Invalid shop update payload.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
    }
    const shop = await updateShopForMembership(req.user.id, req.params.shopId, req.body);
    return sendSuccess(res, 'Shop updated successfully.', shop, OK);
  } catch (error) {
    return next(error);
  }
};

export const getShop = async (req, res, next) => {
  try {
    const shop = await getShopForUser(req.user.shopId);
    return sendSuccess(res, 'Shop profile loaded.', shop, OK);
  } catch (error) {
    return next(error);
  }
};

export const updateShop = async (req, res, next) => {
  try {
    const validation = validateShopUpdateInput(req.body);
    if (!validation.isValid) {
      throw new AppError('Invalid shop update payload.', BAD_REQUEST, 'VALIDATION_ERROR');
    }

    const allowedShopId = req.user.shopId;
    const shop = await updateShopForUser(allowedShopId, req.body);
    return sendSuccess(res, 'Shop updated successfully.', shop, OK);
  } catch (error) {
    return next(error);
  }
};
