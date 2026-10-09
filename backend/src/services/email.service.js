import nodemailer from 'nodemailer';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import { SERVICE_UNAVAILABLE } from '../constants/httpStatus.js';

const isSmtpConfigured = () => Boolean(
  env.smtp.host
  && Number.isInteger(env.smtp.port)
  && env.smtp.port > 0
  && env.smtp.from,
);

export const assertSmtpConfigured = () => {
  if (!isSmtpConfigured()) {
    throw new AppError(
      'Password reset email is not configured. Contact support.',
      SERVICE_UNAVAILABLE,
      'PASSWORD_RESET_UNAVAILABLE',
    );
  }
};

export const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  assertSmtpConfigured();
  const transport = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    ...(env.smtp.user && env.smtp.password
      ? { auth: { user: env.smtp.user, pass: env.smtp.password } }
      : {}),
  });
  await transport.sendMail({
    from: env.smtp.from,
    to,
    subject: 'Reset your TrackinHub password',
    text: `We received a request to reset your TrackinHub password. Use this link within 30 minutes:\n\n${resetUrl}\n\nIf you did not request a password reset, you can ignore this email.`,
    html: `<p>We received a request to reset your TrackinHub password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request a password reset, you can ignore this email.</p>`,
  });
};
