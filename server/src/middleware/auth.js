import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { queryOne } from '../config/db.js';
import ApiError from '../utils/ApiError.js';

export const AUTH_COOKIE = 'g3b_token';
export const CSRF_COOKIE = 'g3b_csrf';

const cookieBase = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: '/',
};

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, env.auth.secret, {
    expiresIn: env.auth.expiresIn,
  });
}

export function setAuthCookies(res, user) {
  const token = signToken(user);
  const csrfToken = crypto.randomBytes(24).toString('hex');

  res.cookie(AUTH_COOKIE, token, { ...cookieBase, maxAge: 12 * 60 * 60 * 1000 });
  // The CSRF cookie must be readable by the browser so the SPA can echo it back.
  res.cookie(CSRF_COOKIE, csrfToken, { ...cookieBase, httpOnly: false, maxAge: 12 * 60 * 60 * 1000 });

  return { token, csrfToken };
}

export function clearAuthCookies(res) {
  res.clearCookie(AUTH_COOKIE, cookieBase);
  res.clearCookie(CSRF_COOKIE, { ...cookieBase, httpOnly: false });
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

    const payload = jwt.verify(token, env.auth.secret);
    const user = await queryOne(
      'SELECT id, name, email, role, status FROM users WHERE id = ? LIMIT 1',
      [payload.sub],
    );

    if (user && user.status === 'active') {
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

/**
 * Double-submit CSRF protection. Only enforced for cookie based auth, so
 * token/Bearer clients (and automated tests) are unaffected.
 */
export function csrfProtection(req, _res, next) {
  if (!MUTATING_METHODS.has(req.method)) return next();
  if (req.authMethod !== 'cookie') return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(ApiError.forbidden('Invalid or missing CSRF token.'));
  }
  return next();
}
