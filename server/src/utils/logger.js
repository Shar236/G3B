import env from '../config/env.js';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const activeLevel = env.isProduction ? LEVELS.info : LEVELS.debug;

/** Minimal structured logger (JSON in production, readable locally). */
function log(level, message, meta = {}) {
  if (LEVELS[level] > activeLevel) return;
  const entry = { level, time: new Date().toISOString(), message, ...meta };

  if (env.isProduction) {
    process.stdout.write(`${JSON.stringify(entry)}\n`);
    return;
  }

  const suffix = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  // eslint-disable-next-line no-console
  console[method](`[${level}] ${message}${suffix}`);
}

export const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),
};

export default logger;
