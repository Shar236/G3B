import rateLimit from 'express-rate-limit';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const handler = (_req, _res, next) => {
  next(ApiError.tooManyRequests('Too many requests. Please try again later.'));
};

/** Throttle public enquiry submissions to reduce spam and duplicate floods. */
export const enquiryRateLimiter = rateLimit({
  windowMs: env.rateLimit.enquiryWindowMinutes * 60 * 1000,
  max: env.rateLimit.enquiryMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler,
});

/** Throttle login attempts to slow down brute force attacks. */
export const loginRateLimiter = rateLimit({
  windowMs: env.rateLimit.loginWindowMinutes * 60 * 1000,
  max: env.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.ip,
  handler,
});

/** Global limiter applied to the whole API surface. */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export default { enquiryRateLimiter, loginRateLimiter, globalRateLimiter };
