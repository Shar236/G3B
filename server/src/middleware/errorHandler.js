import env from '../config/env.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/ApiError.js';

/** 404 handler for unmatched routes. */
export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} was not found.`));
}

/** Centralised error handler - the single place that formats error responses. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, _next) {
  let status = error.status || 500;
  let message = error.message || 'Internal server error';
  let details = error.details;

  // Translate common PostgreSQL failures into friendly responses.
  if (error.code === '23505') {
    status = 409;
    message = 'A record with these details already exists.';
  } else if (error.code === '23503') {
    status = 409;
    message = 'This record is referenced by other data and cannot be changed.';
  } else if (['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', '28P01', '3D000', '57P01'].includes(error.code)) {
    status = 503;
    message = 'Database is currently unavailable.';
  } else if (error.name === 'MulterError') {
    status = 400;
    message = error.code === 'LIMIT_FILE_SIZE' ? 'The uploaded file is too large.' : error.message;
  }

  if (status >= 500) {
    logger.error('Unhandled request error', {
      method: req.method,
      url: req.originalUrl,
      error: error.message,
      stack: env.isProduction ? undefined : error.stack,
    });
  } else {
    logger.warn('Request rejected', { method: req.method, url: req.originalUrl, status, error: message });
  }

  const body = { success: false, error: message };
  if (details) body.details = details;
  if (!env.isProduction && status >= 500) body.stack = error.stack;

  res.status(status).json(body);
}

export default errorHandler;
