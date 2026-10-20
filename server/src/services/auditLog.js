import { query } from '../config/db.js';
import logger from '../utils/logger.js';

/**
 * Persist a sensitive change to the audit trail.
 *
 * Failures are logged but never thrown: losing an audit row must not break the
 * administrator's action, and the operation itself is already committed.
 *
 * @param {import('express').Request} req  Request carrying the authenticated user.
 * @param {object} entry
 * @param {string} entry.action       Machine-readable action, e.g. 'page.seo.publish'.
 * @param {string} [entry.entityType] Affected entity type, e.g. 'page'.
 * @param {string|number} [entry.entityId]
 * @param {string} [entry.summary]    Human-readable one-liner.
 * @param {object} [entry.changes]    Optional structured diff.
 */
export async function recordAudit(req, { action, entityType = null, entityId = null, summary = null, changes = null }) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, summary, changes, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req?.user?.id ?? null,
        req?.user?.email ?? null,
        action,
        entityType,
        entityId === null || entityId === undefined ? null : String(entityId),
        summary,
        changes ? JSON.stringify(changes) : null,
        req?.ip ?? null,
        req?.get?.('user-agent')?.slice(0, 255) ?? null,
      ],
    );
  } catch (error) {
    logger.error('Failed to write audit log', { action, error: error.message });
  }
}

export default recordAudit;
