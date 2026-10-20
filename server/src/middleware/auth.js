import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { queryOne } from '../config/db.js';
import ApiError from '../utils/ApiError.js';

export const AUTH_COOKIE = 'g3b_token';
export const CSRF_COOKIE = 'g3b_csrf';
export const REFRESH_COOKIE = 'g3b_refresh';

const cookieBase = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: '/',
};

export function signToken(user, session) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email, type: 'access', ver: user.auth_version ?? user.authVersion ?? 0, ...(session?.familyId ? { sid: session.familyId } : {}) }, env.auth.secret, {
    expiresIn: env.auth.expiresIn,
  });
}

export function setAuthCookies(res, user, session) {
  const token = signToken(user, session);
  const csrfToken = crypto.randomBytes(24).toString('hex');

  const expires = jwt.decode(token).exp * 1000;
  res.cookie(AUTH_COOKIE, token, { ...cookieBase, maxAge: Math.max(0, expires - Date.now()) });
  // The CSRF cookie must be readable by the browser so the SPA can echo it back.
  const sessionMaxAge = session ? Math.max(0, new Date(session.expiresAt).getTime() - Date.now()) : Math.max(0, expires - Date.now());
  res.cookie(CSRF_COOKIE, csrfToken, { ...cookieBase, httpOnly: false, maxAge: sessionMaxAge });
  if (session) res.cookie(REFRESH_COOKIE, session.token, { ...cookieBase, path: '/api/auth', maxAge: sessionMaxAge });

  return { token, csrfToken };
}

export function clearAuthCookies(res) {
  res.clearCookie(AUTH_COOKIE, cookieBase);
  res.clearCookie(CSRF_COOKIE, { ...cookieBase, httpOnly: false });
  res.clearCookie(REFRESH_COOKIE, { ...cookieBase, path: '/api/auth' });
}

function extractToken(req) {
  if (req.cookies?.[AUTH_COOKIE]) {
    return { token: req.cookies[AUTH_COOKIE], method: 'cookie' };
  }
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return { token: header.slice(7), method: 'header' };
  }
  return { token: null, method: null };
}

/**
 * Resolve the authenticated user (if any) from the JWT and attach it to the
 * request. Never throws - downstream guards decide what is required.
 */
export async function resolveUser(req, _res, next) {
  try {
    const { token, method } = extractToken(req);
    if (!token) return next();

    const payload = jwt.verify(token, env.auth.secret, { algorithms: ['HS256'] });
    if (payload.type !== 'access') return next();
    const user = await queryOne(
      'SELECT id, name, email, role, status, auth_version FROM users WHERE id = ? LIMIT 1',
      [payload.sub],
    );

    if (payload.sid) {
      const activeSession = await queryOne('SELECT id FROM auth_sessions WHERE user_id = ? AND family_id = ? AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1', [payload.sub, payload.sid]);
      if (!activeSession) return next();
    }

    if (user && user.status === 'active' && (payload.ver ?? 0) === user.auth_version) {
      req.user = user;
      req.authMethod = method;
    }
    return next();
  } catch {
    // Invalid/expired token: continue as anonymous.
    return next();
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  return next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }
    return next();
  };
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function requireCookieCsrf(req, _res, next) {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers['x-csrf-token'];
  const validTokens = typeof cookieToken === 'string' && typeof headerToken === 'string' && /^[a-f0-9]{48}$/.test(cookieToken) && /^[a-f0-9]{48}$/.test(headerToken);
  if (!validTokens || !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return next(ApiError.forbidden('Invalid or missing CSRF token.'));
  }
  return next();
}

/**
 * Double-submit CSRF protection. Only enforced for cookie based auth, so
 * token/Bearer clients (and automated tests) are unaffected.
 */
export function csrfProtection(req, _res, next) {
  if (!MUTATING_METHODS.has(req.method)) return next();
  if (req.authMethod !== 'cookie') return next();

  return requireCookieCsrf(req, _res, next);
}
