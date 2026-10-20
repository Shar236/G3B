import env from '../config/env.js';
import { sendMail, isMailEnabled } from './mailer.js';
import { notificationsRepository } from '../repositories/userRepository.js';
import logger from '../utils/logger.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function adminBody(enquiry) {
  return [
    `Name: ${enquiry.fullName}`,
    `Phone: ${enquiry.phone}`,
    `Email: ${enquiry.email}`,
    `Interested in: ${enquiry.serviceInterest}`,
    `Preferred destination: ${enquiry.preferredDestination || '—'}`,
    '',
    'Message:',
    enquiry.message || '—',
  ].join('\n');
}

function adminHtml(enquiry) {
  return `
    <h2>New website enquiry</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td><strong>Name</strong></td><td>${escapeHtml(enquiry.fullName)}</td></tr>
      <tr><td><strong>Phone</strong></td><td>${escapeHtml(enquiry.phone)}</td></tr>
      <tr><td><strong>Email</strong></td><td>${escapeHtml(enquiry.email)}</td></tr>
      <tr><td><strong>Interested in</strong></td><td>${escapeHtml(enquiry.serviceInterest)}</td></tr>
      <tr><td><strong>Preferred destination</strong></td><td>${escapeHtml(enquiry.preferredDestination || '—')}</td></tr>
    </table>
    <p><strong>Message</strong></p>
    <p>${escapeHtml(enquiry.message || '—').replace(/\n/g, '<br />')}</p>
  `;
}

function visitorBody(enquiry) {
  return [
    `Dear ${enquiry.fullName},`,
    '',
    'Thank you for contacting G3B Education. We have received your enquiry and a counsellor will get in touch with you shortly.',
    '',
    'Your submission:',
    `  Service of interest: ${enquiry.serviceInterest}`,
    `  Preferred destination: ${enquiry.preferredDestination || '—'}`,
    '',
    'G3B Education',
    'Career Guidance · Psychometric Assessment · Study Abroad',
    '8928659569 | admissions.g3beducation@gmail.com',
  ].join('\n');
}

function visitorHtml(enquiry) {
  return `
    <p>Dear ${escapeHtml(enquiry.fullName)},</p>
    <p>Thank you for contacting <strong>G3B Education</strong>. We have received your enquiry and a
    counsellor will get in touch with you shortly.</p>
    <p><strong>Service of interest:</strong> ${escapeHtml(enquiry.serviceInterest)}<br />
    <strong>Preferred destination:</strong> ${escapeHtml(enquiry.preferredDestination || '—')}</p>
    <p>G3B Education<br />Career Guidance · Psychometric Assessment · Study Abroad<br />
    8928659569 | admissions.g3beducation@gmail.com</p>
  `;
}

/**
 * Persist a notification then attempt immediate delivery.
 * On failure the row stays in the queue and a retry job can pick it up.
 */
async function dispatch({ enquiry, to, subject, text, html, kind, replyTo }) {
  const status = isMailEnabled() ? 'pending' : 'pending';
  const notificationId = await notificationsRepository.enqueue({
    enquiryId: enquiry.id,
    recipient: to,
    subject,
    body: text,
    kind,
    status,
    lastError: isMailEnabled() ? null : 'Email delivery is not configured (MAIL_HOST empty).',
  });

  const result = await sendMail({ to, subject, text, html, replyTo });
  if (result.sent) {
    await notificationsRepository.markSent(notificationId);
  } else {
    await notificationsRepository.markFailed(notificationId, result.error || 'Unknown error');
  }
  return result;
}

/**
 * Send the administrator notification and the visitor confirmation.
 * @returns {Promise<{ admin: object, visitor: object|null }>}
 */
export async function notifyEnquiry(enquiry) {
  const adminRecipient = env.mail.adminNotificationEmail || env.mail.user || '';
  let adminResult = { sent: false, error: 'No administrator notification address configured.' };

  if (adminRecipient) {
    adminResult = await dispatch({
      enquiry,
      to: adminRecipient,
      subject: `[G3B Education] Website enquiry from ${enquiry.fullName}`,
      text: adminBody(enquiry),
      html: adminHtml(enquiry),
      kind: 'admin',
      replyTo: `${enquiry.fullName} <${enquiry.email}>`,
    });
  } else {
    logger.warn('No ADMIN_NOTIFICATION_EMAIL configured; admin notification skipped.');
  }

  const visitorResult = await dispatch({
    enquiry,
    to: enquiry.email,
    subject: 'We received your enquiry — G3B Education',
    text: visitorBody(enquiry),
    html: visitorHtml(enquiry),
    kind: 'visitor',
  });

  return { admin: adminResult, visitor: visitorResult };
}

/** Retry queued notifications (invoked by a scheduled job). */
export async function retryPendingNotifications(limit = 20) {
  const pendingRows = await notificationsRepository.pending(limit);
  const results = { attempted: pendingRows.length, sent: 0, failed: 0 };

  for (const row of pendingRows) {
    const result = await sendMail({
      to: row.recipient,
      subject: row.subject,
      text: row.body,
    });
    if (result.sent) {
      await notificationsRepository.markSent(row.id);
      results.sent += 1;
    } else {
      await notificationsRepository.markFailed(row.id, result.error);
      results.failed += 1;
    }
  }

  return results;
}

export default { notifyEnquiry, retryPendingNotifications };
