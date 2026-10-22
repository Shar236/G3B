import crypto from 'node:crypto';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { hashStudentToken, studentRepository } from '../repositories/studentRepository.js';

export const STUDENT_COOKIE = 'g3b_student_session';
export const STUDENT_CSRF = 'g3b_student_csrf';
const cookieOptions = { httpOnly: true, secure: env.cookie.secure, sameSite: env.cookie.sameSite, path: '/api' };

export function setStudentCookies(res, session) {
  const maxAge = Math.max(0, session.expiresAt.getTime() - Date.now());
  res.cookie(STUDENT_COOKIE, session.token, { ...cookieOptions, maxAge });
  res.cookie(STUDENT_CSRF, session.csrfToken, { ...cookieOptions, httpOnly: false, path: '/', maxAge });
}

export function clearStudentCookies(res) {
  res.clearCookie(STUDENT_COOKIE, cookieOptions);
  res.clearCookie(STUDENT_CSRF, { ...cookieOptions, httpOnly: false, path: '/' });
}

export async function resolveStudent(req, _res, next) {
  const token = req.cookies?.[STUDENT_COOKIE];
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return next();
  try {
    const student = await studentRepository.resolveSession(token);
    if (student) req.student = student;
    return next();
  } catch (error) { return next(error); }
}

export function requireStudent(req, _res, next) {
  return req.student ? next() : next(ApiError.unauthorized('Please sign in to your student account.'));
}

export function studentCsrf(req, _res, next) {
  const cookie = req.cookies?.[STUDENT_CSRF];
  const header = req.get('x-student-csrf-token');
  const valid = typeof cookie === 'string' && /^[a-f0-9]{48}$/.test(cookie) && typeof header === 'string' && /^[a-f0-9]{48}$/.test(header);
  if (!valid || !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header)) || hashStudentToken(header) !== req.student?.csrf_hash) {
    return next(ApiError.forbidden('Your session needs to be refreshed. Reload the page and try again.'));
  }
  return next();
}

export function optionalStudentCsrf(req, res, next) {
  // An expired cookie must never silently turn a private submission into a
  // public enquiry that the student cannot find in their dashboard.
  if (req.cookies?.[STUDENT_COOKIE] && !req.student) return next(ApiError.unauthorized('Your student session has expired. Sign in again before submitting.'));
  return req.student ? studentCsrf(req, res, next) : next();
}
