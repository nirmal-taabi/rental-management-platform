import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const getAuthCookieOptions = (tokenLifetime = env.jwt.expiresIn) => ({
  httpOnly: true,
  secure: env.app.nodeEnv === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: tokenLifetimeToMs(tokenLifetime),
});

function tokenLifetimeToMs(lifetime) {
  if (!lifetime || typeof lifetime !== 'string') return 24 * 60 * 60 * 1000;

  const match = /^([0-9]+)([smhd])$/.exec(lifetime.toLowerCase());
  if (!match) return 24 * 60 * 60 * 1000;

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;

  return 24 * 60 * 60 * 1000;
}

export const signToken = (payload) =>
  jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });

export const parseAuthToken = (token) => {
  const normalizedToken = token?.startsWith('Bearer ') ? token.slice(7) : token;
  if (!normalizedToken) {
    throw new Error('Missing token');
  }

  return jwt.verify(normalizedToken, env.jwt.secret);
};

export const extractTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
  if (!match) return null;

  return decodeURIComponent(match[1]);
};

export const buildAuthCookie = (token) => ({
  name: 'auth_token',
  value: token,
  options: getAuthCookieOptions(),
});

export const clearAuthCookie = () => ({
  name: 'auth_token',
  value: '',
  options: {
    ...getAuthCookieOptions(),
    maxAge: 0,
  },
});
