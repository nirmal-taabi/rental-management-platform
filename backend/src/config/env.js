import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

const getDatabaseConnectionString = (value) => {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hash) {
      throw new Error('Invalid PostgreSQL URL');
    }
    decodeURIComponent(url.username);
    decodeURIComponent(url.password);
  } catch {
    throw new Error(
      'DATABASE_URL must be a valid PostgreSQL URL. URL-encode reserved characters in credentials (for example, # as %23) and omit placeholder brackets and surrounding quotes.',
    );
  }

  return value;
};

const connectionString = getDatabaseConnectionString(process.env.DATABASE_URL);
if (nodeEnv === 'production' && !connectionString) {
  throw new Error('DATABASE_URL is required in production. Set it in the Render environment.');
}

const dbPassword = process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim() !== '' ? process.env.DB_PASSWORD : undefined;

const env = {
  app: {
    port: Number(process.env.PORT || 5000),
    nodeEnv,
    clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean),
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || '',
  },
  db: {
    connectionString,
    ssl: String(process.env.DB_SSL || '').toLowerCase() === 'true',
    sslRejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || 'rental_management',
    user: process.env.DB_USER || 'rental_user',
    password: dbPassword || undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
};

export default env;
