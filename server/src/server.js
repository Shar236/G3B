#!/usr/bin/env node
import env, { validateEnv } from './config/env.js';
import { createApp } from './app.js';
import { queryOne, pingDatabase, closePool } from './config/db.js';
import logger from './utils/logger.js';
import { startYouTubeSyncScheduler } from './services/youtubeSyncService.js';

validateEnv();
const app = createApp();

async function waitForDatabase(maxRetries = env.isProduction ? 5 : 1, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await pingDatabase();
      return true;
    } catch (err) {
      if (attempt < maxRetries) {
        logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms...`, { error: err.message });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw err;
      }
    }
  }
}

async function start() {
  try {
    await waitForDatabase();
    logger.info('Database connection established', { database: env.db.name, host: env.db.host });

    const schema = await queryOne("SELECT to_regclass('public.content_blocks') AS table_name");
    if (!schema?.table_name) throw new Error('PostgreSQL schema is missing. Run npm run migrate:supabase before starting the API.');
  } catch (error) {
    logger.error('Could not connect to Supabase PostgreSQL. Check DATABASE_URL.', { error: error.message });
    if (env.isProduction) process.exit(1);
    logger.warn('Starting anyway (development). Data endpoints will return 503 until the database is reachable.');
  }

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

if (process.env.VERCEL !== '1') start();

export { app, start };
export default app;
