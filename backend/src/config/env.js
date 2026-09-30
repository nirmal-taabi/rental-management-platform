import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbPassword = process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim() !== '' ? process.env.DB_PASSWORD : undefined;

const env = {
  app: {
    port: Number(process.env.PORT || 5000),
    nodeEnv: process.env.NODE_ENV || 'development',
    clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean),
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
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
