import AppError from '../utils/AppError.js';
import { UNAUTHORIZED } from '../constants/httpStatus.js';
import { AUTHENTICATION_ERROR } from '../constants/errorCodes.js';
import { parseAuthToken, extractTokenFromRequest } from '../utils/jwt.js';
import { findUserById } from '../repositories/user.repository.js';
import { findRolesForUser } from '../repositories/role.repository.js';

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

    const roles = await findRolesForUser(user.id, user.shop_id);
    req.user = {
      id: user.id,
      shopId: user.shop_id,
      email: user.email,
      roles,
    };
    req.shopId = user.shop_id;

    return next();
  } catch (error) {
    return next(error);
  }
};
