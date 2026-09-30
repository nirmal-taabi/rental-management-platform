import AppError from '../utils/AppError.js';
import { pool } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken, buildAuthCookie } from '../utils/jwt.js';
import { createShop, generateShopSlug, findShopById } from '../repositories/shop.repository.js';
import { createUser, findUserByEmail, findUserById, getSafeUserSummary } from '../repositories/user.repository.js';
import { createRole, findRoleByShopAndSlug, assignRoleToUser, findRolesForUser } from '../repositories/role.repository.js';
import { CONFLICT, UNAUTHORIZED } from '../constants/httpStatus.js';
import { EMAIL_ALREADY_EXISTS, INVALID_CREDENTIALS, INACTIVE_USER } from '../constants/errorCodes.js';

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

    await connection.commit();

    return {
      user: {
        id: newUser.id,
        name: `${newUser.first_name} ${newUser.last_name || ''}`.trim(),
        email: newUser.email,
        phone: newUser.phone,
        roles: ['OWNER'],
      },
      shop: getPublicShop(shopRecord),
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

  const shop = await findShopById(user.shop_id);
  if (!shop) {
    throw new AppError('Shop not found for this account.', UNAUTHORIZED, INVALID_CREDENTIALS);
  }

  const roles = await findRolesForUser(user.id, user.shop_id);
  const token = signToken({ id: user.id, shopId: user.shop_id, roles });

  return {
    token,
    cookie: buildAuthCookie(token),
    user: {
      ...getSafeUserSummary(user),
      roles,
    },
    shop: getPublicShop(shop),
  };
};

export const getAuthenticatedUserProfile = async (userId) => {
  if (userId === undefined || userId === null) {
    throw new AppError('Authentication required.', UNAUTHORIZED, 'AUTHENTICATION_ERROR');
  }

  const existingUser = await findUserById(userId);
  if (!existingUser) {
    throw new AppError('User not found.', UNAUTHORIZED, 'AUTHENTICATION_ERROR');
  }

  const shop = await findShopById(existingUser.shop_id);
  const roles = await findRolesForUser(existingUser.id, existingUser.shop_id);

  return {
    user: {
      ...getSafeUserSummary(existingUser),
      roles,
    },
    shop: shop ? getPublicShop(shop) : null,
  };
};
