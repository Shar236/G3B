import crypto from 'node:crypto';
import { subscribersRepository } from '../repositories/subscribersRepository.js';
import { sendMail } from '../services/mailer.js';
import { recordAudit } from '../services/auditLog.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import toCsv from '../utils/csv.js';
import logger from '../utils/logger.js';

export async function subscribe(req, res) {
  const token = crypto.randomBytes(32).toString('hex');
  const existing = await subscribersRepository.findByEmail(req.body.email);
  await subscribersRepository.subscribe({ ...req.body, token });
  // This transactional welcome mail is best-effort; stored consent is the success criterion.
  if (env.mail.enabled && (!existing || existing.status !== 'active')) {
    const base = (process.env.PUBLIC_SITE_URL || env.clientOrigins[0]).replace(/\/$/, '');
    const unsubscribeUrl = `${base}/unsubscribe?token=${token}`;
    try {
      const delivery = await sendMail({
        to: req.body.email, subject: 'Welcome to G3B Education updates',
        text: `You have subscribed to G3B Education updates.\nManage your subscription or unsubscribe: ${unsubscribeUrl}`,
        html: `<p>You have subscribed to G3B Education updates.</p><p><a href="${unsubscribeUrl}">Unsubscribe from updates</a></p>`,
      });
      if (!delivery.sent) logger.warn('Subscriber welcome email was not delivered');
    } catch (error) { logger.warn('Subscriber welcome email failed', { error: error.message }); }
  }
  res.json({ success: true, data: { message: 'Your subscription has been saved. Thank you for joining G3B Education.' } });
}

export async function unsubscribe(req, res) {
  const changed = await subscribersRepository.unsubscribe(req.body.token);
  if (!changed) throw ApiError.badRequest('This unsubscribe link is invalid or has expired.');
  res.json({ success: true, data: { message: 'You have been unsubscribed from education updates.' } });
}

export async function listSubscribers(req, res) {
  const result = await subscribersRepository.list(req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
}
export async function exportSubscribers(req, res) {
  const rows = await subscribersRepository.listForExport(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="g3b-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(toCsv(rows, ['id', 'email', 'phone', 'source', 'status', 'consentAt', 'unsubscribedAt', 'createdAt', 'updatedAt']));
}
export async function createSubscriber(req, res) {
  if (await subscribersRepository.findByEmail(req.body.email)) throw ApiError.conflict('This email is already in the subscriber list.');
  const subscriber = await subscribersRepository.create(req.body);
  await recordAudit(req, { action: 'subscriber.create', entityType: 'subscriber', entityId: subscriber.id });
  res.status(201).json({ success: true, data: subscriber });
}
export async function updateSubscriber(req, res) {
  if (!await subscribersRepository.findById(req.params.id)) throw ApiError.notFound('Subscriber not found.');
  if (req.body.email) {
    const existing = await subscribersRepository.findByEmail(req.body.email);
    if (existing && Number(existing.id) !== Number(req.params.id)) throw ApiError.conflict('This email is already in the subscriber list.');
  }
  const subscriber = await subscribersRepository.update(req.params.id, req.body);
  await recordAudit(req, { action: 'subscriber.update', entityType: 'subscriber', entityId: subscriber.id });
  res.json({ success: true, data: subscriber });
}
export async function deleteSubscriber(req, res) {
  if (!await subscribersRepository.remove(req.params.id)) throw ApiError.notFound('Subscriber not found.');
  await recordAudit(req, { action: 'subscriber.delete', entityType: 'subscriber', entityId: req.params.id });
  res.json({ success: true, data: { message: 'Subscriber deleted.' } });
}
export async function bulkSubscribers(req, res) {
  if (req.body.action === 'delete' && req.user.role !== 'admin') throw ApiError.forbidden('Only administrators can delete subscribers.');
  const affected = await subscribersRepository.bulk(req.body);
  await recordAudit(req, { action: `subscriber.bulk.${req.body.action}`, entityType: 'subscriber', summary: `${affected} subscribers affected`, changes: req.body });
  res.json({ success: true, data: { affected } });
}
