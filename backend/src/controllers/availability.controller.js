import { sendSuccess } from '../utils/apiResponse.js';
import { OK } from '../constants/httpStatus.js';
import {
  checkBulkInventoryAvailability,
  checkInventoryAvailability,
  getProductAvailability,
  getShopInventoryAvailability,
} from '../services/availability.service.js';

export const getInventoryAvailability = async (req, res, next) => {
  try {
    const result = await checkInventoryAvailability(req.user.shopId, req.query);
    return sendSuccess(res, 'Availability checked successfully.', result, OK);
  } catch (error) {
    return next(error);
  }
};

export const postBulkAvailability = async (req, res, next) => {
  try {
    const result = await checkBulkInventoryAvailability(req.user.shopId, req.body);
    return sendSuccess(res, 'Availability checked successfully.', result, OK);
  } catch (error) {
    return next(error);
  }
};

export const getProductAvailabilityItems = async (req, res, next) => {
  try {
    const result = await getProductAvailability(req.user.shopId, req.query);
    return sendSuccess(res, 'Product availability retrieved successfully.', result, OK);
  } catch (error) {
    return next(error);
  }
};

export const getShopInventoryAvailabilityItems = async (req, res, next) => {
  try {
    const result = await getShopInventoryAvailability(req.user.shopId, req.query);
    return sendSuccess(res, 'Shop inventory availability retrieved successfully.', result, OK);
  } catch (error) {
    return next(error);
  }
};