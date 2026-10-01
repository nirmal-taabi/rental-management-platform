import { sendSuccess } from '../utils/apiResponse.js';
import { OK } from '../constants/httpStatus.js';
import {
  getDashboardActivityForShop,
  getDashboardAttentionForShop,
  getDashboardOperationsForShop,
  getDashboardSummaryForShop,
} from '../services/dashboard.service.js';

export const getSummary = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Dashboard summary retrieved.', await getDashboardSummaryForShop(req.user.shopId, req.query, req.user.shopRole), OK);
  } catch (error) {
    return next(error);
  }
};

export const getOperations = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Dashboard operations retrieved.', await getDashboardOperationsForShop(req.user.shopId), OK);
  } catch (error) {
    return next(error);
  }
};

export const getAttention = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Dashboard attention items retrieved.', await getDashboardAttentionForShop(req.user.shopId, req.user.shopRole), OK);
  } catch (error) {
    return next(error);
  }
};

export const getActivity = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Dashboard activity retrieved.', await getDashboardActivityForShop(req.user.shopId), OK);
  } catch (error) {
    return next(error);
  }
};