import AppError from '../utils/AppError.js';
import { clearAuthCookie } from '../utils/jwt.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { registerOwner, loginUser, getAuthenticatedUserProfile } from '../services/auth.service.js';
import {
  validateForgotPasswordInput,
  validateLoginInput,
  validateRegisterInput,
  validateResetPasswordInput,
} from '../validators/auth.validator.js';
import { changeOwnPassword } from '../services/team.service.js';
import { requestPasswordReset, resetPassword } from '../services/passwordReset.service.js';
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

export const forgotPassword = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const validation = validateForgotPasswordInput(payload);
    if (!validation.isValid) {
      throw new AppError('Invalid password reset request.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
    }

    await requestPasswordReset(payload.email);
    return sendSuccess(
      res,
      'If an active account exists for this email, you will receive a password reset link shortly.',
      {},
      OK,
    );
  } catch (error) {
    return next(error);
  }
};

export const resetPasswordWithToken = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const validation = validateResetPasswordInput(payload);
    if (!validation.isValid) {
      throw new AppError('Invalid password reset data.', BAD_REQUEST, 'VALIDATION_ERROR', true, validation.errors);
    }

    await resetPassword(payload);
    const cookie = clearAuthCookie();
    res.clearCookie(cookie.name, cookie.options);
    return sendSuccess(res, 'Password reset successfully. Please sign in with your new password.', {}, OK);
  } catch (error) {
    return next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const result = await changeOwnPassword(
      req.user.id,
      req.body,
      req.user.passwordResetRequired,
    );
    return sendSuccess(res, 'Password updated successfully.', result, OK);
  } catch (error) {
    return next(error);
  }
};
