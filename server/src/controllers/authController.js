import bcrypt from 'bcryptjs';
import { usersRepository } from '../repositories/userRepository.js';
import { setAuthCookies, clearAuthCookies, CSRF_COOKIE } from '../middleware/auth.js';
import { requestPasswordReset, resetPassword } from '../services/passwordResetService.js';
import { recordAudit } from '../services/auditLog.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  lastLoginAt: user.lastLoginAt ?? user.last_login_at ?? null,
});

/** POST /api/auth/login */
export async function login(req, res) {
  const { email, password } = req.body;
  const user = await usersRepository.findByEmail(email);

  // A locked account is refused before the password is even compared.
  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    logger.warn('Login attempt on a locked account', { email, ip: req.ip });
    throw ApiError.tooManyRequests('This account is temporarily locked after too many failed attempts. Try again shortly.');
  }

  // Constant-ish time: always run a comparison to reduce user enumeration.
  const hash = user?.password_hash || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';
  const passwordMatches = await bcrypt.compare(password, hash);

  if (!user || !passwordMatches) {
    if (user) await usersRepository.registerFailedLogin(user.id, { maxAttempts: MAX_FAILED_ATTEMPTS, lockMinutes: LOCK_MINUTES });
    logger.warn('Failed login attempt', { email, ip: req.ip });
    throw ApiError.unauthorized('Invalid email or password.');
  }

  if (user.status !== 'active') {
    throw ApiError.forbidden('This account has been disabled.');
  }

  const { csrfToken } = setAuthCookies(res, user);
  await usersRepository.clearLoginFailures(user.id);

  res.json({ success: true, data: { user: publicUser(user), csrfToken } });
}

/** POST /api/auth/logout */
export async function logout(_req, res) {
  clearAuthCookies(res);
  res.json({ success: true, data: { message: 'Signed out.' } });
}

/** GET /api/auth/me */
export async function me(req, res) {
  if (!req.user) {
    return res.json({ success: true, data: { user: null, csrfToken: req.cookies?.[CSRF_COOKIE] || null } });
  }
  const user = await usersRepository.findById(req.user.id);
  return res.json({
    success: true,
    data: { user: user ? publicUser(user) : null, csrfToken: req.cookies?.[CSRF_COOKIE] || null },
  });
}

/**
 * POST /api/auth/forgot-password
 * Always answers identically, so the endpoint cannot be used to discover which
 * email addresses have administrator accounts.
 */
export async function forgotPassword(req, res) {
  await requestPasswordReset(req.body.email, { ipAddress: req.ip ?? null });
  res.json({
    success: true,
    data: { message: 'If that address belongs to an account, a reset link has been sent.' },
  });
}

/** POST /api/auth/reset-password */
export async function resetPasswordHandler(req, res) {
  const result = await resetPassword(req.body.token, req.body.password);
  if (!result) {
    throw ApiError.badRequest('This reset link is invalid or has expired. Request a new one.');
  }

  await recordAudit(req, {
    action: 'auth.password_reset',
    entityType: 'user',
    entityId: result.userId,
    summary: 'Password was reset using a recovery link',
  });

  res.json({ success: true, data: { message: 'Your password has been updated. You can now sign in.' } });
}

export default { login, logout, me, forgotPassword, resetPasswordHandler };
