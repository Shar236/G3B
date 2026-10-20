import env, { validateEnv } from './config/env.js';
import { createApp } from './app.js';
import { pingDatabase, closePool } from './config/db.js';
import logger from './utils/logger.js';
import { startYouTubeSyncScheduler } from './services/youtubeSyncService.js';

async function start() {
  validateEnv();

  try {
    await pingDatabase();
    logger.info('Database connection established', { database: env.db.name, host: env.db.host });
  } catch (error) {
    logger.error('Could not connect to MySQL. Check DB_* values in server/.env', { error: error.message });
    if (env.isProduction) process.exit(1);
    logger.warn('Starting anyway (development). Data endpoints will return 503 until the database is reachable.');
  }

  const app = createApp();
  const server = app.listen(env.port, env.host, () => {
    logger.info(`G3B Education API listening on http://${env.host}:${env.port}`, {
      environment: env.nodeEnv,
      allowedOrigins: env.clientOrigins,
    });
  });
  const stopYouTubeSync = startYouTubeSyncScheduler();

  const shutdown = async (signal) => {
    stopYouTubeSync();
    logger.info(`Received ${signal}, shutting down gracefully.`);
    server.close(async () => {
      await closePool().catch(() => {});
      process.exit(0);
    });
    // Force exit if connections do not drain in time.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  });
}

start();

export { start };
