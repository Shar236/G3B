import crypto from 'node:crypto';
import { query, queryOne } from '../config/db.js';
import { mapRow } from './catalogRepository.js';
import { appendDates, sortClause } from '../utils/listFilters.js';

export const hashSubscriberToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const COLUMNS = 's.id,s.email,s.phone,s.source,s.status,s.consent_at,s.unsubscribed_at,s.created_at,s.updated_at';

function filtersFor(filters = {}) {
  const where = [];
  const params = [];
  for (const key of ['status', 'source']) if (filters[key]) { where.push(`s.${key} = ?`); params.push(filters[key]); }
  if (filters.search) {
    where.push('(s.email LIKE ? OR s.phone LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  appendDates(where, params, filters, 's');
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export const subscribersRepository = {
  async findById(id) {
    const row = await queryOne(`SELECT ${COLUMNS} FROM newsletter_subscribers s WHERE s.id = ?`, [id]);
    return row ? mapRow(row) : null;
  },
  async findByEmail(email) {
    const row = await queryOne(`SELECT ${COLUMNS} FROM newsletter_subscribers s WHERE s.email = ?`, [email]);
    return row ? mapRow(row) : null;
  },
  async subscribe({ email, phone, source = 'newsletter', token }) {
    await query(
      `INSERT INTO newsletter_subscribers (email,phone,source,status,consent_at,unsubscribe_token_hash)
       VALUES (?,?,?,'active',NOW(),?)
       ON DUPLICATE KEY UPDATE phone = COALESCE(VALUES(phone),phone), source = VALUES(source),
         unsubscribe_token_hash = IF(status = 'unsubscribed' OR unsubscribe_token_hash IS NULL,VALUES(unsubscribe_token_hash),unsubscribe_token_hash),
         consent_at = NOW(), status = 'active', unsubscribed_at = NULL`,
      [email, phone || null, source, hashSubscriberToken(token)],
    );
  },
  async unsubscribe(token) {
    const result = await query(
      "UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = COALESCE(unsubscribed_at,NOW()) WHERE unsubscribe_token_hash = ?",
      [hashSubscriberToken(token)],
    );
    return result.affectedRows > 0;
  },
  async list({ page = 1, perPage = 20, ...filters } = {}) {
    const { clause, params } = filtersFor(filters);
    const order = sortClause(filters.sortBy, filters.sortDir, { createdAt: 's.created_at', email: 's.email', status: 's.status' }).replace(', id DESC', ', s.id DESC');
    const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM newsletter_subscribers s ${clause}`, params);
    const rows = await query(`SELECT ${COLUMNS} FROM newsletter_subscribers s ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, perPage, (page - 1) * perPage]);
    const total = Number(totalRow.total);
    return { items: rows.map(mapRow), pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) } };
  },
  async listForExport(filters = {}) {
    const { clause, params } = filtersFor(filters);
    const order = sortClause(filters.sortBy, filters.sortDir, { createdAt: 's.created_at', email: 's.email', status: 's.status' }).replace(', id DESC', ', s.id DESC');
    return (await query(`SELECT ${COLUMNS} FROM newsletter_subscribers s ${clause} ORDER BY ${order}`, params)).map(mapRow);
  },
  async create({ email, phone, source = 'newsletter', status = 'active' }) {
    const result = await query(
      'INSERT INTO newsletter_subscribers (email,phone,source,status,consent_at,unsubscribed_at) VALUES (?,?,?,?,NOW(),?)',
      [email, phone || null, source, status, status === 'unsubscribed' ? new Date() : null],
    );
    return this.findById(result.insertId);
  },
  async update(id, payload) {
    const assignments = [];
    const params = [];
    for (const key of ['email', 'phone', 'source', 'status']) {
      if (payload[key] !== undefined) { assignments.push(`${key} = ?`); params.push(payload[key] || null); }
    }
    if (payload.status) assignments.push(payload.status === 'unsubscribed' ? 'unsubscribed_at = NOW()' : 'unsubscribed_at = NULL');
    if (assignments.length) await query(`UPDATE newsletter_subscribers SET ${assignments.join(',')} WHERE id = ?`, [...params, id]);
    return this.findById(id);
  },
  async remove(id) { return (await query('DELETE FROM newsletter_subscribers WHERE id = ?', [id])).affectedRows > 0; },
  async bulk({ ids, action }) {
    const uniqueIds = [...new Set(ids)];
    const placeholders = uniqueIds.map(() => '?').join(',');
    const result = action === 'delete'
      ? await query(`DELETE FROM newsletter_subscribers WHERE id IN (${placeholders})`, uniqueIds)
      : await query(`UPDATE newsletter_subscribers SET status = ?, unsubscribed_at = ${action === 'unsubscribe' ? 'NOW()' : 'NULL'} WHERE id IN (${placeholders})`, [action === 'activate' ? 'active' : 'unsubscribed', ...uniqueIds]);
    return Number(result.affectedRows);
  },
};
