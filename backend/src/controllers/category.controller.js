import { sendSuccess } from '../utils/apiResponse.js';
import { CREATED, OK } from '../constants/httpStatus.js';
import {
  createCategoryForShop,
  getCategoriesForShop,
  getCategoryForShop,
  updateCategoryForShop,
  updateCategoryStatusForShop,
} from '../services/category.service.js';

const auditContext = (req) => ({ userId: req.user.id, ipAddress: req.ip });

export const getCategories = async (req, res, next) => {
  try {
    const result = await getCategoriesForShop(req.user.shopId, req.query);
    return res.status(OK).json({ success: true, message: 'Categories retrieved successfully.', ...result });
  } catch (error) {
    return next(error);
  }
};

export const getCategory = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Category retrieved successfully.', await getCategoryForShop(req.user.shopId, req.params.id), OK);
  } catch (error) {
    return next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const category = await createCategoryForShop(req.user.shopId, req.body, auditContext(req));
    return sendSuccess(res, 'Category created successfully.', category, CREATED);
  } catch (error) {
    return next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await updateCategoryForShop(req.user.shopId, req.params.id, req.body, auditContext(req));
    return sendSuccess(res, 'Category updated successfully.', category, OK);
  } catch (error) {
    return next(error);
  }
};

export const updateCategoryStatus = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Category status updated successfully.', await updateCategoryStatusForShop(req.user.shopId, req.params.id, req.body, auditContext(req)), OK);
  } catch (error) {
    return next(error);
  }
};
