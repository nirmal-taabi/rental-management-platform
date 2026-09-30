import AppError from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { BAD_REQUEST, CREATED, OK } from '../constants/httpStatus.js';
import {
  createCustomerForShop,
  createCustomerDraftForShop,
  deleteCustomerDraftForShop,
  getCustomerDraftForShop,
  getCustomerDraftsForShop,
  getCustomerForShop,
  getCustomersForShop,
  updateCustomerDraftForShop,
  updateCustomerForShop,
  updateCustomerStatusForShop,
} from '../services/customer.service.js';
import { validateCustomerInput, validateCustomerStatusInput } from '../validators/customer.validator.js';

export const getCustomers = async (req, res, next) => {
  try {
    const result = await getCustomersForShop(req.user.shopId, req.query);
    return res.status(OK).json({
      success: true,
      message: 'Customers retrieved successfully.',
      data: result.data,
      pagination: result.pagination,
      summary: result.summary,
    });
  } catch (error) {
    return next(error);
  }
};

export const getCustomerDrafts = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Customer drafts retrieved successfully.', await getCustomerDraftsForShop(req.user.shopId), OK);
  } catch (error) {
    return next(error);
  }
};

export const getCustomerDraft = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Customer draft retrieved successfully.', await getCustomerDraftForShop(req.user.shopId, req.params.id), OK);
  } catch (error) {
    return next(error);
  }
};

export const createCustomerDraft = async (req, res, next) => {
  try {
    const draft = await createCustomerDraftForShop(req.user.shopId, req.user.id, req.body);
    return sendSuccess(res, 'Customer draft saved successfully.', draft, CREATED);
  } catch (error) {
    return next(error);
  }
};

export const updateCustomerDraft = async (req, res, next) => {
  try {
    const draft = await updateCustomerDraftForShop(req.user.shopId, req.params.id, req.body);
    return sendSuccess(res, 'Customer draft updated successfully.', draft, OK);
  } catch (error) {
    return next(error);
  }
};

export const removeCustomerDraft = async (req, res, next) => {
  try {
    const draft = await deleteCustomerDraftForShop(req.user.shopId, req.params.id);
    return sendSuccess(res, 'Customer draft deleted successfully.', draft, OK);
  } catch (error) {
    return next(error);
  }
};

export const getCustomer = async (req, res, next) => {
  try {
    const customer = await getCustomerForShop(req.user.shopId, req.params.id);
    return sendSuccess(res, 'Customer retrieved successfully.', customer, OK);
  } catch (error) {
    return next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const validation = validateCustomerInput(req.body);
    if (!validation.isValid) {
      throw new AppError('Invalid customer data.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
    }

    const customer = await createCustomerForShop(req.user.shopId, req.body);
    return sendSuccess(res, 'Customer created successfully.', customer, CREATED);
  } catch (error) {
    return next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const validation = validateCustomerInput(req.body);
    if (!validation.isValid) {
      throw new AppError('Invalid customer update data.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
    }

    const customer = await updateCustomerForShop(req.user.shopId, req.params.id, req.body);
    return sendSuccess(res, 'Customer updated successfully.', customer, OK);
  } catch (error) {
    return next(error);
  }
};

export const updateCustomerStatus = async (req, res, next) => {
  try {
    const validation = validateCustomerStatusInput(req.body);
    if (!validation.isValid) {
      throw new AppError('Invalid customer status.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
    }

    const customer = await updateCustomerStatusForShop(req.user.shopId, req.params.id, req.body.status);
    return sendSuccess(res, 'Customer status updated successfully.', customer, OK);
  } catch (error) {
    return next(error);
  }
};
