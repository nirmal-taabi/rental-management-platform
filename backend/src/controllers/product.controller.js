import { sendSuccess } from '../utils/apiResponse.js';
import { CREATED, OK } from '../constants/httpStatus.js';
import {
  createProductForShop,
  getProductForShop,
  getProductsForShop,
  getProductImagePathForShop,
  getProductSkuSuggestionForShop,
  updateProductForShop,
  updateProductStatusForShop,
} from '../services/product.service.js';

const auditContext = (req) => ({ userId: req.user.id, ipAddress: req.ip });

export const getProducts = async (req, res, next) => {
  try {
    const result = await getProductsForShop(req.user.shopId, req.query);
    return res.status(OK).json({ success: true, message: 'Products retrieved successfully.', ...result });
  } catch (error) {
    return next(error);
  }
};

export const getProductSkuSuggestion = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Product SKU suggestion generated successfully.', await getProductSkuSuggestionForShop(req.user.shopId, req.query), OK);
  } catch (error) {
    return next(error);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Product retrieved successfully.', await getProductForShop(req.user.shopId, req.params.id), OK);
  } catch (error) {
    return next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const product = await createProductForShop(req.user.shopId, req.body, req.files || [], auditContext(req));
    return sendSuccess(res, 'Product created successfully.', product, CREATED);
  } catch (error) {
    return next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await updateProductForShop(req.user.shopId, req.params.id, req.body, req.files || [], auditContext(req));
    return sendSuccess(res, 'Product updated successfully.', product, OK);
  } catch (error) {
    return next(error);
  }
};

export const updateProductStatus = async (req, res, next) => {
  try {
    const product = await updateProductStatusForShop(req.user.shopId, req.params.id, req.body, auditContext(req));
    return sendSuccess(res, 'Product status updated successfully.', product, OK);
  } catch (error) {
    return next(error);
  }
};

export const getProductImage = async (req, res, next) => {
  try {
    const filePath = await getProductImagePathForShop(req.user.shopId, req.params.shopId, req.params.filename);
    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    return next(error);
  }
};