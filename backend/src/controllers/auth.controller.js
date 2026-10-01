import AppError from '../utils/AppError.js';
import { clearAuthCookie } from '../utils/jwt.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { registerOwner, loginUser, getAuthenticatedUserProfile } from '../services/auth.service.js';
import { validateRegisterInput, validateLoginInput } from '../validators/auth.validator.js';
import { BAD_REQUEST, OK, CREATED } from '../constants/httpStatus.js';

export const register = async (req, res, next) => {
  try {
    const validation = validateRegisterInput(req.body);
    if (!validation.isValid) {
      throw new AppError('Invalid registration data.', BAD_REQUEST, 'VALIDATION_ERROR');
    }

    const result = await registerOwner(req.body);
    return sendSuccess(res, 'Registration successful. Please log in.', result, CREATED);
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const validation = validateLoginInput(req.body);
    if (!validation.isValid) {
      throw new AppError('Invalid login data.', BAD_REQUEST, 'VALIDATION_ERROR');
    }

    const result = await loginUser(req.body);
    const { cookie } = result;

    res.cookie(cookie.name, cookie.value, cookie.options);
    return sendSuccess(res, 'Login successful.', {
      user: result.user,
      shop: result.shop,
      shops: result.shops,
    }, OK);
  } catch (error) {
    return next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const result = await getAuthenticatedUserProfile(req.user.id, req.user.shopId);
    return sendSuccess(res, 'User profile loaded.', result, OK);
  } catch (error) {
    return next(error);
  }
};

export const logout = (req, res) => {
  const cookie = clearAuthCookie();
  res.clearCookie(cookie.name, cookie.options);

  return sendSuccess(res, 'Logged out successfully.', {}, OK);
};
