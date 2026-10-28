import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { usersRepository } from '../repositories/userRepository.js';
import { setAuthCookies, clearAuthCookies, CSRF_COOKIE, REFRESH_COOKIE } from '../middleware/auth.js';
import { sessionsRepository } from '../repositories/sessionsRepository.js';
import { requestPasswordReset, resetPassword } from '../services/passwordResetService.js';
import { recordAudit } from '../services/auditLog.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
// A valid bcrypt hash keeps unknown-account checks on the same expensive path.
const dummyPasswordHash = bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

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
  const { username, email, password } = req.body;
  const identifier = username?.trim() || email;
  const isUsernameLogin = Boolean(username?.trim());
  const user = isUsernameLogin
    ? (identifier.toLowerCase() === env.admin.username.toLowerCase()
      ? await usersRepository.findByEmail(env.admin.email)
      : null)
    : await usersRepository.findByEmail(email);

  // A locked account is refused before the password is even compared.
  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    logger.warn('Login attempt on a locked account', { identifier, ip: req.ip });
    throw ApiError.tooManyRequests('This account is temporarily locked after too many failed attempts. Try again shortly.');
  }

  // Constant-ish time: always run a comparison to reduce user enumeration.
  const hash = user?.password_hash || await dummyPasswordHash;
  const passwordMatches = await bcrypt.compare(password, hash);

  if (!user || !passwordMatches) {
    if (user) await usersRepository.registerFailedLogin(user.id, { maxAttempts: MAX_FAILED_ATTEMPTS, lockMinutes: LOCK_MINUTES });
    logger.warn('Failed login attempt', { identifier, ip: req.ip });
    throw ApiError.unauthorized(isUsernameLogin ? 'Invalid username or password.' : 'Invalid email or password.');
  }

  if (user.status !== 'active') {
    throw ApiError.forbidden('This account has been disabled.');
  }

  const session = await sessionsRepository.create(user.id);
  const { csrfToken } = setAuthCookies(res, user, session);
  await usersRepository.clearLoginFailures(user.id);

  res.json({ success: true, data: { user: publicUser(user), csrfToken } });
}

/** POST /api/auth/logout */
export async function logout(req, res) {
  if (req.cookies?.[REFRESH_COOKIE]) await sessionsRepository.revoke(req.cookies[REFRESH_COOKIE]);
  clearAuthCookies(res);
  res.json({ success: true, data: { message: 'Signed out.' } });
}

/** Rotate a single-use, opaque refresh token; access JWTs never refresh themselves. */
export async function refreshToken(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    clearAuthCookies(res);
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }
  const session = await sessionsRepository.rotate(token);
  if (!session) {
    clearAuthCookies(res);
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }
  const { csrfToken } = setAuthCookies(res, session.user, session);
  res.json({ success: true, data: { user: publicUser(session.user), csrfToken } });
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
