import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../utils/logger.js';

let transporter = null;

function getTransporter() {
  if (!env.mail.enabled) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    auth: env.mail.user ? { user: env.mail.user, pass: env.mail.password } : undefined,
  });

  return transporter;
}

export function isMailEnabled() {
  return env.mail.enabled;
}

/**
 * Send an email. Never throws - callers persist the notification so it can be
 * retried later when delivery fails.
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
export async function sendMail({ to, subject, text, html, replyTo }) {
  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    return { sent: false, error: 'MAIL_HOST is not configured (email delivery disabled).' };
  }

  try {
    const info = await activeTransporter.sendMail({
      from: env.mail.from,
      to,
      subject,
      text,
      html,
      replyTo,
    });
    logger.info('Email sent', { messageId: info.messageId, to });
    return { sent: true };
  } catch (error) {
    logger.warn('Email delivery failed', { to, error: error.message });
    return { sent: false, error: error.message };
  }
}

export default { sendMail, isMailEnabled };
