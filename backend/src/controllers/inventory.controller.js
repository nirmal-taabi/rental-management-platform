import { sendSuccess } from '../utils/apiResponse.js';
import { CREATED, OK } from '../constants/httpStatus.js';
import {
  createInventoryItemForShop,
  getInventoryForShop,
  getInventoryItemForShop,
  getInventorySummaryForShop,
  retireInventoryItemForShop,
  updateInventoryItemConditionForShop,
  updateInventoryItemForShop,
  updateInventoryItemStatusForShop,
} from '../services/inventory.service.js';

const auditContext = (req) => ({ userId: req.user.id, ipAddress: req.ip });

export const getInventory = async (req, res, next) => {
  try {
    const result = await getInventoryForShop(req.user.shopId, req.query);
    return res.status(OK).json({ success: true, message: 'Inventory retrieved successfully.', ...result });
  } catch (error) {
    return next(error);
  }
};

export const getInventorySummary = async (req, res, next) => {
  try {
    const summary = await getInventorySummaryForShop(req.user.shopId, req.query);
    return sendSuccess(res, 'Inventory summary retrieved successfully.', summary, OK);
  } catch (error) {
    return next(error);
  }
};

export const getInventoryItem = async (req, res, next) => {
  try {
    const item = await getInventoryItemForShop(req.user.shopId, req.params.id);
    return sendSuccess(res, 'Inventory item retrieved successfully.', item, OK);
  } catch (error) {
    return next(error);
  }
};

export const createInventoryItem = async (req, res, next) => {
  try {
    const item = await createInventoryItemForShop(req.user.shopId, req.body, auditContext(req));
    return sendSuccess(res, 'Inventory item created successfully.', item, CREATED);
  } catch (error) {
    return next(error);
  }
};

export const updateInventoryItem = async (req, res, next) => {
  try {
    const item = await updateInventoryItemForShop(req.user.shopId, req.params.id, req.body, auditContext(req));
    return sendSuccess(res, 'Inventory item updated successfully.', item, OK);
  } catch (error) {
    return next(error);
  }
};

export const updateInventoryStatus = async (req, res, next) => {
  try {
    const item = await updateInventoryItemStatusForShop(req.user.shopId, req.params.id, req.body, auditContext(req));
    return sendSuccess(res, 'Inventory status updated successfully.', item, OK);
  } catch (error) {
    return next(error);
  }
};

export const updateInventoryCondition = async (req, res, next) => {
  try {
    const item = await updateInventoryItemConditionForShop(req.user.shopId, req.params.id, req.body, auditContext(req));
    return sendSuccess(res, 'Inventory condition updated successfully.', item, OK);
  } catch (error) {
    return next(error);
  }
};

export const retireInventoryItem = async (req, res, next) => {
  try {
    const item = await retireInventoryItemForShop(req.user.shopId, req.params.id, auditContext(req));
    return sendSuccess(res, 'Inventory item retired successfully.', item, OK);
  } catch (error) {
    return next(error);
  }
};