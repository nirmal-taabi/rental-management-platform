import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger from './utils/logger.js';
import env from './config/env.js';
import requestLogger from './middlewares/requestLogger.js';
import notFoundHandler from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import apiRoutes from './routes/index.js';

const app = express();
//sdsd

// Build the allowed-origins Set from CLIENT_URL (supports comma-separated values).
// e.g. CLIENT_URL=https://app.vercel.app,https://www.myshop.com
const allowedOrigins = new Set([
  ...(env.app.clientUrl || []),
  ...(env.app.nodeEnv === 'development'
    ? ['http://localhost:5173', 'http://localhost:5174']
    : []),
]);

// Logged at startup — verify this in your Render / Vercel logs.
logger.info('CORS allowed origins', { origins: [...allowedOrigins] });

const corsOptions = {
  origin: (origin, callback) => {
    // No Origin header = server-to-server or same-origin → allow.
    if (!origin) return callback(null, true);

    // Normalise: strip a trailing slash so https://foo.com/ matches https://foo.com
    const normOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.has(normOrigin)) return callback(null, true);

    // Deny — pass null (not an Error) so preflight returns 204 instead of 500.
    logger.warn('CORS blocked origin', { origin });
    return callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 204, // IE11 compatibility
};

app.use(helmet());

// Register CORS middleware AND handle OPTIONS preflight for every route.
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: {
//     success: false,
//     message: 'Too many requests. Please try again later.',
//     error: { code: 'RATE_LIMIT_EXCEEDED' },
//   },
// });
// app.use(limiter);

app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Rental Management Platform API',
  });
});

app.use('/api/v1', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.on('error', (error) => {
  logger.error('Application error', error);
});

export default app;
