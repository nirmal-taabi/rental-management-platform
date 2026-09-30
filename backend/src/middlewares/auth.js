import AppError from '../utils/AppError.js';
import { UNAUTHORIZED } from '../constants/httpStatus.js';
import { AUTHENTICATION_ERROR } from '../constants/errorCodes.js';

export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', UNAUTHORIZED, AUTHENTICATION_ERROR));
  }

  return next();
};
