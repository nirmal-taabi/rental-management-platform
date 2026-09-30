import AppError from '../utils/AppError.js';
import { CONFLICT, BAD_REQUEST, NOT_FOUND } from '../constants/httpStatus.js';
import { DUPLICATE_CUSTOMER } from '../constants/errorCodes.js';
import { validateCustomerDraftInput, validateCustomerInput, validateCustomerStatusInput } from '../validators/customer.validator.js';
import {
  createCustomerDraft,
  deleteCustomerDraft,
  findCustomerDraftById,
  findCustomerDraftsByShop,
  updateCustomerDraft,
} from '../repositories/customerDraft.repository.js';
import {
  countCustomersByShop,
  createCustomer,
  findCustomerByEmail,
  findCustomerById,
  findCustomerByPhone,
  findCustomersByShop,
  getCustomerSummaryByShop,
  updateCustomer,
  updateCustomerStatus,
} from '../repositories/customer.repository.js';

const normalizeCustomerPayload = (payload = {}) => ({
  firstName: String(payload.firstName || '').trim(),
  lastName: String(payload.lastName || '').trim(),
  phone: String(payload.phone || '').trim(),
  alternatePhone: String(payload.alternatePhone || '').trim(),
  email: String(payload.email || '').trim(),
  address: String(payload.address || '').trim(),
  addressLine2: String(payload.addressLine2 || '').trim(),
  city: String(payload.city || '').trim(),
  state: String(payload.state || '').trim(),
  pincode: String(payload.pincode || '').trim(),
  notes: String(payload.notes || '').trim(),
  status: String(payload.status || 'ACTIVE').trim().toUpperCase(),
});

const toPublicCustomer = (customer) => ({
  id: customer.id,
  shopId: customer.shopId,
  firstName: customer.firstName,
  lastName: customer.lastName,
  phone: customer.phone,
  alternatePhone: customer.alternatePhone,
  email: customer.email,
  address: customer.address,
  addressLine2: customer.addressLine2,
  city: customer.city,
  state: customer.state,
  pincode: customer.pincode,
  notes: customer.notes,
  status: customer.status,
  createdAt: customer.createdAt,
  updatedAt: customer.updatedAt,
});

const customerDraftFields = ['firstName', 'lastName', 'phone', 'alternatePhone', 'email', 'address', 'city', 'state', 'pincode', 'notes'];

const normalizeCustomerDraft = (payload = {}) => Object.fromEntries(
  customerDraftFields.map((field) => [field, String(payload[field] || '').trim()]),
);

const parseCustomerDraftId = (draftId) => {
  const parsedId = Number(draftId);
  if (!Number.isSafeInteger(parsedId) || parsedId < 1) {
    throw new AppError('Customer draft id must be a positive integer.', BAD_REQUEST, 'VALIDATION_ERROR');
  }
  return parsedId;
};

const validateDraft = (payload) => {
  const validation = validateCustomerDraftInput(payload);
  if (!validation.isValid) {
    throw new AppError('Invalid customer draft data.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
  }
};

export const getCustomerDraftsForShop = async (shopId) => findCustomerDraftsByShop(shopId);

export const getCustomerDraftForShop = async (shopId, draftId) => {
  const draft = await findCustomerDraftById(shopId, parseCustomerDraftId(draftId));
  if (!draft) throw new AppError('Customer draft not found.', NOT_FOUND, 'CUSTOMER_DRAFT_NOT_FOUND');
  return draft;
};

export const createCustomerDraftForShop = async (shopId, userId, payload) => {
  validateDraft(payload);
  return createCustomerDraft(shopId, userId, normalizeCustomerDraft(payload));
};

export const updateCustomerDraftForShop = async (shopId, draftId, payload) => {
  validateDraft(payload);
  const normalizedDraftId = parseCustomerDraftId(draftId);
  const draft = await updateCustomerDraft(shopId, normalizedDraftId, normalizeCustomerDraft(payload));
  if (!draft) throw new AppError('Customer draft not found.', NOT_FOUND, 'CUSTOMER_DRAFT_NOT_FOUND');
  return draft;
};

export const deleteCustomerDraftForShop = async (shopId, draftId) => {
  const deleted = await deleteCustomerDraft(shopId, parseCustomerDraftId(draftId));
  if (!deleted) throw new AppError('Customer draft not found.', NOT_FOUND, 'CUSTOMER_DRAFT_NOT_FOUND');
  return { id: Number(draftId) };
};

export const getCustomersForShop = async (shopId, query = {}) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const status = String(query.status || '').trim().toUpperCase();
  const rentalFilter = ['ACTIVE', 'UPCOMING'].includes(String(query.rentalFilter || '').trim().toUpperCase())
    ? String(query.rentalFilter).trim().toUpperCase()
    : '';
  const search = String(query.search || '').trim();
  const sortBy = ['created_at', 'updated_at', 'first_name', 'last_name', 'status'].includes(query.sortBy) ? query.sortBy : 'created_at';
  const sortOrder = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

  const [totalItems, customers, summary] = await Promise.all([
    countCustomersByShop(shopId, { search, status, rentalFilter }),
    findCustomersByShop(shopId, { page, limit, search, status, rentalFilter, sortBy, sortOrder }),
    getCustomerSummaryByShop(shopId, { search }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    data: customers.map(toPublicCustomer),
    summary,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

export const getCustomerForShop = async (shopId, customerId) => {
  const customer = await findCustomerById(shopId, customerId);
  if (!customer) {
    throw new AppError('Customer not found.', NOT_FOUND, 'CUSTOMER_NOT_FOUND');
  }

  return toPublicCustomer(customer);
};

export const createCustomerForShop = async (shopId, payload = {}) => {
  const normalized = normalizeCustomerPayload(payload);
  const validation = validateCustomerInput(normalized);
  if (!validation.isValid) {
    throw new AppError('Invalid customer payload.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
  }

  if (normalized.phone) {
    const existingByPhone = await findCustomerByPhone(shopId, normalized.phone);
    if (existingByPhone) {
      throw new AppError('A customer with this phone number already exists in this shop.', CONFLICT, DUPLICATE_CUSTOMER);
    }
  }

  if (normalized.email) {
    const existingByEmail = await findCustomerByEmail(shopId, normalized.email);
    if (existingByEmail) {
      throw new AppError('A customer with this email already exists in this shop.', CONFLICT, DUPLICATE_CUSTOMER);
    }
  }

  const customer = await createCustomer(shopId, normalized);
  return toPublicCustomer(customer);
};

export const updateCustomerForShop = async (shopId, customerId, payload = {}) => {
  const customer = await findCustomerById(shopId, customerId);
  if (!customer) {
    throw new AppError('Customer not found.', NOT_FOUND, 'CUSTOMER_NOT_FOUND');
  }

  const normalized = normalizeCustomerPayload({
    ...customer,
    ...payload,
  });

  const validation = validateCustomerInput(normalized);
  if (!validation.isValid) {
    throw new AppError('Invalid customer update payload.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
  }

  if (normalized.phone !== customer.phone) {
    const existingByPhone = await findCustomerByPhone(shopId, normalized.phone);
    if (existingByPhone && existingByPhone.id !== customerId) {
      throw new AppError('A customer with this phone number already exists in this shop.', CONFLICT, DUPLICATE_CUSTOMER);
    }
  }

  if (normalized.email && normalized.email !== (customer.email || '').toLowerCase()) {
    const existingByEmail = await findCustomerByEmail(shopId, normalized.email);
    if (existingByEmail && existingByEmail.id !== customerId) {
      throw new AppError('A customer with this email already exists in this shop.', CONFLICT, DUPLICATE_CUSTOMER);
    }
  }

  const updatedCustomer = await updateCustomer(shopId, customerId, normalized);
  return toPublicCustomer(updatedCustomer);
};

export const updateCustomerStatusForShop = async (shopId, customerId, status) => {
  const customer = await findCustomerById(shopId, customerId);
  if (!customer) {
    throw new AppError('Customer not found.', NOT_FOUND, 'CUSTOMER_NOT_FOUND');
  }

  const validation = validateCustomerStatusInput({ status });
  if (!validation.isValid) {
    throw new AppError('Invalid customer status.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
  }

  const updatedCustomer = await updateCustomerStatus(shopId, customerId, status);
  return toPublicCustomer(updatedCustomer);
};
