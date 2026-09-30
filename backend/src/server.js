import app from './app.js';
import env from './config/env.js';
import logger from './utils/logger.js';

const port = env.app.port;

const server = app.listen(port, () => {
  logger.info(`Rental Management API started on port ${port}`);
});

const shutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully.`);

  server.close(() => {
    logger.info('Server closed successfully');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;
