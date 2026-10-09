import AppError from '../utils/AppError.js';
import { FORBIDDEN, UNAUTHORIZED } from '../constants/httpStatus.js';
import { AUTHENTICATION_ERROR } from '../constants/errorCodes.js';
import { parseAuthToken, extractTokenFromRequest } from '../utils/jwt.js';
import { findUserById } from '../repositories/user.repository.js';
import {
  findActiveShopMembership,
  findDefaultShopMembership,
} from '../repositories/userShopMembership.repository.js';
import { findPlatformRolesForUser } from '../repositories/role.repository.js';

const getMembershipForRequest = async (req, userId, tokenShopId) => {
  const requestedShopId = req.get('X-Shop-Id')?.trim();
  if (requestedShopId) {
    return findActiveShopMembership(userId, requestedShopId);
  }

  const tokenMembership = tokenShopId
    ? await findActiveShopMembership(userId, tokenShopId)
    : null;
  return tokenMembership || findDefaultShopMembership(userId);
};

export const authMiddleware = async (req, res, next) => {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      throw new AppError('Authentication required.', UNAUTHORIZED, AUTHENTICATION_ERROR);
    }

    const payload = parseAuthToken(token);
    const user = await findUserById(payload.id);
    if (!user) {
      throw new AppError('Authentication required.', UNAUTHORIZED, AUTHENTICATION_ERROR);
    }

    if (user.status !== 'active') {
      throw new AppError('Account is inactive.', UNAUTHORIZED, 'INACTIVE_USER');
    }

    const [membership, platformRoles] = await Promise.all([
      getMembershipForRequest(req, user.id, payload.shopId),
      findPlatformRolesForUser(user.id),
    ]);
    if (!membership) {
      throw new AppError('You do not have access to this shop.', FORBIDDEN, 'SHOP_ACCESS_DENIED');
    }

    const shopId = membership.shop_id;
    const role = String(membership.role || 'STAFF').toUpperCase();
    req.user = {
      id: user.id,
      shopId,
      email: user.email,
      roles: [role],
      platformRoles,
      shopRole: role,
      passwordResetRequired: Boolean(user.password_reset_required),
    };
    req.tenant = { shopId, role };
    req.shop = {
      id: shopId,
      name: membership.name,
      code: membership.slug,
      role,
      status: String(membership.shop_status || '').toUpperCase(),
      isDefault: Boolean(membership.is_default),
      city: membership.city,
      state: membership.state,
    };

    const passwordResetAllowedPaths = [
      '/api/v1/auth/me',
      '/api/v1/auth/logout',
      '/api/v1/auth/change-password',
    ];
    const requestPath = req.originalUrl.split('?')[0];
    if (req.user.passwordResetRequired && !passwordResetAllowedPaths.includes(requestPath)) {
      throw new AppError(
        'Change your temporary password before using the workspace.',
        FORBIDDEN,
        'PASSWORD_CHANGE_REQUIRED',
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
