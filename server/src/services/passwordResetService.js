import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { usersRepository } from '../repositories/userRepository.js';
import { passwordResetRepository } from '../repositories/passwordResetRepository.js';
import { sendMail } from './mailer.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const TOKEN_TTL_MINUTES = 60;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function resetBaseUrl() {
  return process.env.PUBLIC_SITE_URL || env.clientOrigins[0] || 'http://localhost:5173';
}

function resetLink(token) {
  return `${resetBaseUrl().replace(/\/$/, '')}${env.admin.route}/reset-password?token=${token}`;
}

/**
 * Request a reset link.
 *
 * Always resolves the same way whether or not the address exists, so the
 * endpoint cannot be used to enumerate administrator accounts.
 */
export async function requestPasswordReset(email, { ipAddress = null } = {}) {
  const user = await usersRepository.findByEmail(email);

  if (!user || user.status !== 'active') {
    logger.info('Password reset requested for unknown or inactive account');
    return { delivered: false };
  }

  await passwordResetRepository.invalidateForUser(user.id);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await passwordResetRepository.create({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
    ipAddress,
  });

  const link = resetLink(token);
  const result = await sendMail({
    to: user.email,
    subject: 'Reset your G3B Education admin password',
    text: [
      `Hello ${user.name},`,
      '',
      'A password reset was requested for your administrator account.',
      `Open this link within ${TOKEN_TTL_MINUTES} minutes to choose a new password:`,
      link,
      '',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n'),
    html: `<p>Hello ${user.name},</p><p>A password reset was requested for your administrator account.</p>
      <p><a href="${link}">Choose a new password</a> (valid for ${TOKEN_TTL_MINUTES} minutes).</p>
      <p>If you did not request this, you can safely ignore this email.</p>`,
  });

  if (!result.sent) {
    logger.warn('Password reset email could not be delivered', { error: result.error });
  }

  return { delivered: result.sent };
}

/** Consume a reset token and set a new password. Returns null when invalid. */
export async function resetPassword(token, newPassword) {
  if (!token) return null;

  const record = await passwordResetRepository.findActiveByHash(hashToken(token));
  if (!record) return null;

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await usersRepository.update(record.user_id, { passwordHash });
  await passwordResetRepository.markUsed(record.id);

  return { userId: Number(record.user_id) };
}

export default { requestPasswordReset, resetPassword };
