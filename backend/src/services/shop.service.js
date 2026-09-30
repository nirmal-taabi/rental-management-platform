import AppError from '../utils/AppError.js';
import { pool } from '../config/database.js';
import { createShop, findShopById, generateShopSlug, updateShop, updateShopStatus } from '../repositories/shop.repository.js';
import { createAuditLog } from '../repositories/audit.repository.js';
import { createRole, findRoleByShopAndSlug, assignRoleToUser } from '../repositories/role.repository.js';
import {
  createShopMembership,
  findActiveShopMembership,
  findShopMembershipsForUser,
  findShopMembershipsForUserForUpdate,
} from '../repositories/userShopMembership.repository.js';
import { BAD_REQUEST, CONFLICT, FORBIDDEN } from '../constants/httpStatus.js';

const getPublicShop = (shop) => ({
  id: shop.id,
  name: shop.name,
  businessName: shop.legal_name || shop.name,
  email: shop.email,
  phone: shop.phone,
  address: shop.address_line1,
  city: shop.city,
  state: shop.state,
  pincode: shop.postal_code,
  gstNumber: shop.gst_number,
  status: shop.status,
});

export const getShopForUser = async (shopId) => {
  const shop = await findShopById(shopId);
  if (!shop) {
    throw new AppError('Shop not found.', FORBIDDEN, 'SHOP_NOT_FOUND');
  }

  return getPublicShop(shop);
};

const getPublicMembershipShop = (membership) => ({
  id: membership.shop_id,
  name: membership.name,
  code: membership.slug,
  businessName: membership.legal_name || membership.name,
  email: membership.email,
  phone: membership.phone,
  address: membership.address_line1,
  city: membership.city,
  state: membership.state,
  pincode: membership.postal_code,
  gstNumber: membership.gst_number,
  role: String(membership.role || 'STAFF').toUpperCase(),
  status: String(membership.shop_status || '').toUpperCase(),
  isDefault: Boolean(membership.is_default),
});

export const getShopMembershipsForUser = async (userId) =>
  (await findShopMembershipsForUser(userId)).map(getPublicMembershipShop);

export const getActiveShopForUser = async (userId, shopId) => {
  const membership = await findActiveShopMembership(userId, shopId);
  if (!membership) {
    throw new AppError('You do not have access to this shop.', FORBIDDEN, 'SHOP_ACCESS_DENIED');
  }
  return getPublicMembershipShop(membership);
};

export const switchShopForUser = getActiveShopForUser;

export const updateShopForMembership = async (userId, shopId, payload) => {
  const membership = (await findShopMembershipsForUser(userId)).find(
    (entry) => String(entry.shop_id) === String(shopId),
  );
  const role = String(membership?.role || '').toUpperCase();
  if (!membership || !['OWNER', 'ADMIN'].includes(role)) {
    throw new AppError('You do not have access to this shop.', FORBIDDEN, 'SHOP_ACCESS_DENIED');
  }
  return updateShopForUser(shopId, payload);
};

export const updateShopStatusForUser = async (userId, shopId, requestedStatus, audit = {}) => {
  const status = String(requestedStatus || '').trim().toLowerCase();
  if (!['active', 'inactive'].includes(status)) {
    throw new AppError('Shop status must be ACTIVE or INACTIVE.', BAD_REQUEST, 'VALIDATION_ERROR');
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const memberships = await findShopMembershipsForUserForUpdate(userId, connection);
    const target = memberships.find((membership) => String(membership.shop_id) === String(shopId));
    const role = String(target?.role || '').toUpperCase();
    if (!target || !['OWNER', 'ADMIN'].includes(role)) {
      throw new AppError('You do not have access to this shop.', FORBIDDEN, 'SHOP_ACCESS_DENIED');
    }

    if (target.shop_status !== status && status === 'inactive') {
      const hasOtherActiveShop = memberships.some((membership) => (
        String(membership.shop_id) !== String(shopId) && membership.shop_status === 'active'
      ));
      if (!hasOtherActiveShop) {
        throw new AppError('Switch to another active shop before deactivating this one.', CONFLICT, 'LAST_ACTIVE_SHOP');
      }
    }

    if (target.shop_status !== status) {
      const updatedShop = await updateShopStatus(shopId, status, connection);
      await createAuditLog({
        ...audit,
        shopId,
        userId,
        entityType: 'shop',
        entityId: shopId,
        action: status === 'inactive' ? 'SHOP_DEACTIVATED' : 'SHOP_REACTIVATED',
        oldValues: { status: target.shop_status },
        newValues: { status },
      }, connection);
      target.shop_status = updatedShop.status;
    }

    await connection.commit();
    return getPublicMembershipShop(target);
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const createShopForUser = async (userId, payload, audit = {}) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const shopRecord = await createShop({
      name: String(payload.name).trim(),
      slug: generateShopSlug(payload.code || payload.name),
      businessName: String(payload.businessName).trim(),
      email: payload.email || null,
      phone: payload.phone || null,
      address: payload.address || null,
      city: payload.city || null,
      state: payload.state || null,
      pincode: payload.pincode || null,
      gstNumber: payload.gstNumber || null,
    }, connection);

    let ownerRole = await findRoleByShopAndSlug(shopRecord.id, 'owner', connection);
    if (!ownerRole) {
      ownerRole = await createRole({
        shopId: shopRecord.id,
        name: 'OWNER',
        slug: 'owner',
        description: 'Business owner access',
        isSystem: true,
      }, connection);
    }

    await createShopMembership({
      userId,
      shopId: shopRecord.id,
      role: 'OWNER',
      status: 'active',
      isDefault: false,
    }, connection);
    await assignRoleToUser(shopRecord.id, userId, ownerRole.id, connection);
    await createAuditLog({
      ...audit,
      shopId: shopRecord.id,
      userId,
      entityType: 'shop',
      entityId: shopRecord.id,
      action: 'SHOP_CREATED',
      newValues: { name: shopRecord.name, slug: shopRecord.slug },
    }, connection);

    await connection.commit();
    return getPublicMembershipShop({
      ...shopRecord,
      shop_id: shopRecord.id,
      role: 'OWNER',
      shop_status: shopRecord.status,
      is_default: 0,
    });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      throw new AppError('A shop with this name or code already exists.', CONFLICT, 'SHOP_CODE_EXISTS');
    }
    throw error;
  } finally {
    connection.release();
  }
};

export const updateShopForUser = async (shopId, payload) => {
  const currentShop = await findShopById(shopId);
  if (!currentShop) {
    throw new AppError('Shop not found.', FORBIDDEN, 'SHOP_NOT_FOUND');
  }

  const normalizedPayload = {
    name: payload.name,
    businessName: payload.businessName,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    gstNumber: payload.gstNumber,
  };

  const nextShop = await updateShop(shopId, {
    name: normalizedPayload.name,
    legal_name: normalizedPayload.businessName,
    email: normalizedPayload.email,
    phone: normalizedPayload.phone,
    address_line1: normalizedPayload.address,
    city: normalizedPayload.city,
    state: normalizedPayload.state,
    postal_code: normalizedPayload.pincode,
    gst_number: normalizedPayload.gstNumber,
  });

  return getPublicShop(nextShop);
};
