import { Router } from 'express';
import { login, logout, me, forgotPassword, resetPasswordHandler, refreshToken } from '../controllers/authController.js';
import { loginRules, forgotPasswordRules, resetPasswordRules } from '../validators/authValidators.js';
import validate from '../middleware/validate.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';
import { requireAuth, requireCookieCsrf } from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.post('/login', loginRateLimiter, loginRules, validate, asyncHandler(login));
// Refresh and logout remain CSRF-protected when the access JWT has expired.
router.post('/logout', requireCookieCsrf, asyncHandler(logout));
router.post('/refresh-token', loginRateLimiter, requireCookieCsrf, asyncHandler(refreshToken));
router.get('/me', asyncHandler(me));
router.get('/session', requireAuth, asyncHandler(me));

// Secure administrator recovery (shared limiter slows down guessing).
router.post('/forgot-password', loginRateLimiter, forgotPasswordRules, validate, asyncHandler(forgotPassword));
router.post('/reset-password', loginRateLimiter, resetPasswordRules, validate, asyncHandler(resetPasswordHandler));

export default router;
