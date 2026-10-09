import AppError from '../utils/AppError.js';
import { FORBIDDEN } from '../constants/httpStatus.js';
import { AUTHORIZATION_ERROR } from '../constants/errorCodes.js';

export const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', FORBIDDEN, AUTHORIZATION_ERROR));
  }

  const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [];
  const platformRoles = Array.isArray(req.user.platformRoles) ? req.user.platformRoles : [];
  const normalizedUserRoles = userRoles.map((role) => String(role).toUpperCase());
  const normalizedPlatformRoles = platformRoles.map((role) => String(role).toUpperCase());
  const normalizedAllowedRoles = allowedRoles.map((role) => String(role).toUpperCase());

  const hasAccess = normalizedAllowedRoles.some((role) => (
    role === 'SUPER_ADMIN'
      ? normalizedPlatformRoles.includes(role)
      : normalizedUserRoles.includes(role)
  ));
  if (!hasAccess) {
    return next(new AppError('You do not have permission to perform this action.', FORBIDDEN, AUTHORIZATION_ERROR));
  }

  return next();
};
