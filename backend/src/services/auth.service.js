import AppError from '../utils/AppError.js';
import { pool } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken, buildAuthCookie } from '../utils/jwt.js';
import { createShop, generateShopSlug } from '../repositories/shop.repository.js';
import { createUser, findUserByEmail, findUserById, getSafeUserSummary } from '../repositories/user.repository.js';
import {
  createRole,
  findRoleByShopAndSlug,
  assignRoleToUser,
  findPlatformRolesForUser,
} from '../repositories/role.repository.js';
import { createShopMembership } from '../repositories/userShopMembership.repository.js';
import { getActiveShopForUser, getShopMembershipsForUser } from './shop.service.js';
import { CONFLICT, UNAUTHORIZED } from '../constants/httpStatus.js';
import { EMAIL_ALREADY_EXISTS, INVALID_CREDENTIALS, INACTIVE_USER } from '../constants/errorCodes.js';

export const registerOwner = async ({ owner, shop }) => {
  const email = String(owner.email || '').trim().toLowerCase();
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new AppError('An account with this email already exists.', CONFLICT, EMAIL_ALREADY_EXISTS);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const shopRecord = await createShop(
      {
        name: shop.name,
        slug: generateShopSlug(shop.name),
        businessName: shop.businessName,
        email: shop.email,
        phone: shop.phone,
        address: shop.address,
        city: shop.city,
        state: shop.state,
        pincode: shop.pincode,
        gstNumber: shop.gstNumber,
      },
      connection,
    );

    let ownerRole = await findRoleByShopAndSlug(shopRecord.id, 'owner', connection);
    if (!ownerRole) {
      ownerRole = await createRole(
        {
          shopId: shopRecord.id,
          name: 'OWNER',
          slug: 'owner',
          description: 'Business owner access',
          isSystem: true,
        },
        connection,
      );
    }

    const passwordHash = await hashPassword(owner.password);
    const newUser = await createUser(
      {
        shopId: shopRecord.id,
        firstName: owner.firstName,
        lastName: owner.lastName,
        email,
        phone: owner.phone,
        passwordHash,
        isOwner: true,
      },
      connection,
    );

    await assignRoleToUser(shopRecord.id, newUser.id, ownerRole.id, connection);
    await createShopMembership({
      userId: newUser.id,
      shopId: shopRecord.id,
      role: 'OWNER',
      status: 'active',
      isDefault: true,
    }, connection);

    await connection.commit();

    return {
      user: {
        id: newUser.id,
        name: `${newUser.first_name} ${newUser.last_name || ''}`.trim(),
        email: newUser.email,
        phone: newUser.phone,
        roles: ['OWNER'],
      },
      shop: {
        id: shopRecord.id,
        name: shopRecord.name,
        code: shopRecord.slug,
        businessName: shopRecord.legal_name || shopRecord.name,
        email: shopRecord.email,
        phone: shopRecord.phone,
        address: shopRecord.address_line1,
        city: shopRecord.city,
        state: shopRecord.state,
        pincode: shopRecord.postal_code,
        gstNumber: shopRecord.gst_number,
        role: 'OWNER',
        status: String(shopRecord.status).toUpperCase(),
        isDefault: true,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError('Invalid credentials.', UNAUTHORIZED, INVALID_CREDENTIALS);
  }

  const passwordMatches = await comparePassword(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError('Invalid credentials.', UNAUTHORIZED, INVALID_CREDENTIALS);
  }

  if (user.status !== 'active') {
    throw new AppError('Account is inactive. Please contact support.', UNAUTHORIZED, INACTIVE_USER);
  }

  const shops = await getShopMembershipsForUser(user.id);
  const shop = shops.find((entry) => entry.status === 'ACTIVE' && entry.isDefault)
    || shops.find((entry) => entry.status === 'ACTIVE');
  if (!shop) {
    throw new AppError('No active shop is available for this account.', UNAUTHORIZED, INVALID_CREDENTIALS);
  }

  const [platformRoles] = await Promise.all([findPlatformRolesForUser(user.id)]);
  const roles = [...new Set([shop.role, ...platformRoles])];
  const token = signToken({ id: user.id });

  return {
    token,
    cookie: buildAuthCookie(token),
    user: {
      ...getSafeUserSummary(user),
      shopId: shop.id,
      isOwner: roles.includes('OWNER'),
      roles,
    },
    shop,
    shops,
  };
};

export const getAuthenticatedUserProfile = async (userId, shopId) => {
  if (userId === undefined || userId === null) {
    throw new AppError('Authentication required.', UNAUTHORIZED, 'AUTHENTICATION_ERROR');
  }

  const existingUser = await findUserById(userId);
  if (!existingUser) {
    throw new AppError('User not found.', UNAUTHORIZED, 'AUTHENTICATION_ERROR');
  }

  const [shop, shops, platformRoles] = await Promise.all([
    getActiveShopForUser(existingUser.id, shopId),
    getShopMembershipsForUser(existingUser.id),
    findPlatformRolesForUser(existingUser.id),
  ]);
  const roles = [...new Set([shop.role, ...platformRoles])];

  return {
    user: {
      ...getSafeUserSummary(existingUser),
      shopId: shop.id,
      isOwner: roles.includes('OWNER'),
      roles,
    },
    shop,
    currentShop: shop,
    shops,
  };
};
