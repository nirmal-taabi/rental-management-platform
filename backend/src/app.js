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
const allowedOrigins = [...new Set([
  ...(env.app.clientUrl || []),
  ...(env.app.nodeEnv === 'development' ? ['http://localhost:5173', 'http://localhost:5174'] : []),
])];

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
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
