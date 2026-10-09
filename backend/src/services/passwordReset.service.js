import { createHash, randomBytes } from 'node:crypto';
import { pool } from '../config/database.js';
import {
  createPasswordResetToken,
  findActiveUserByEmail,
  findActivePasswordResetToken,
  revokeActivePasswordResetTokens,
  revokePasswordResetToken,
  updatePasswordFromReset,
} from '../repositories/user.repository.js';
import { hashPassword } from '../utils/password.js';
import AppError from '../utils/AppError.js';
import { BAD_REQUEST, SERVICE_UNAVAILABLE } from '../constants/httpStatus.js';
import { assertSmtpConfigured, sendPasswordResetEmail } from './email.service.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

const getResetUrl = (token) => {
  const configuredUrl = env.app.clientUrl[0];
  if (!configuredUrl || (env.app.nodeEnv === 'production' && /^https?:\/\/localhost(?::|\/|$)/i.test(configuredUrl))) {
    throw new AppError(
      'Password reset links are not configured. Contact support.',
      SERVICE_UNAVAILABLE,
      'PASSWORD_RESET_UNAVAILABLE',
    );
  }
  const clientUrl = configuredUrl.replace(/\/+$/, '');
  return `${clientUrl}/#/auth/reset-password?token=${encodeURIComponent(token)}`;
};

export const requestPasswordReset = async (email) => {
  assertSmtpConfigured();
  const user = await findActiveUserByEmail(String(email).trim().toLowerCase());
  if (!user) return;

  const token = randomBytes(32).toString('hex');
  const resetUrl = getResetUrl(token);
  const tokenHash = hashToken(token);
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    await revokeActivePasswordResetTokens(user.id, connection);
    await createPasswordResetToken(
      user.id,
      tokenHash,
      new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
      connection,
    );
    await connection.commit();
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  try {
    await sendPasswordResetEmail({ to: user.email, resetUrl });
  } catch {
    try {
      await revokePasswordResetToken(tokenHash);
    } catch {
      logger.error('Password reset token cleanup failed after email delivery failure.');
    }
    logger.error('Password reset email delivery failed.');
    throw new AppError(
      'Password reset email could not be sent. Please try again later.',
      SERVICE_UNAVAILABLE,
      'PASSWORD_RESET_UNAVAILABLE',
    );
  }
};

export const resetPassword = async ({ token, newPassword }) => {
  const passwordHash = await hashPassword(newPassword);
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const resetToken = await findActivePasswordResetToken(hashToken(token), connection);
    if (!resetToken || resetToken.status !== 'active') {
      throw new AppError(
        'This password reset link is invalid or has expired. Request a new one.',
        BAD_REQUEST,
        'PASSWORD_RESET_TOKEN_INVALID',
      );
    }

    await updatePasswordFromReset(resetToken.user_id, passwordHash, connection);
    await revokeActivePasswordResetTokens(resetToken.user_id, connection);
    await connection.commit();
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
