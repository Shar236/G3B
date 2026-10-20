import { query, queryOne } from '../config/db.js';

/**
 * Read-only access to the audit trail.
 *
 * Rows are written by `services/auditLog.js` and are never edited or deleted
 * from the admin UI: the log exists precisely so a sensitive change can be
 * traced back to the administrator who made it.
 */

function parseJsonSafe(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function mapLog(row) {
  return {
    id: String(row.id),
    userId: row.user_id === null ? null : Number(row.user_id),
    userEmail: row.user_email,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    summary: row.summary,
    changes: parseJsonSafe(row.changes),
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

export const auditLogsRepository = {
  async list({ page = 1, perPage = 50, action, entityType, userId, search } = {}) {
    const where = [];
    const params = [];

    if (action) {
      where.push('action = ?');
      params.push(action);
    }
    if (entityType) {
      where.push('entity_type = ?');
      params.push(entityType);
    }
    if (userId) {
      where.push('user_id = ?');
      params.push(Number(userId));
    }
    if (search) {
      where.push('(action LIKE ? OR entity_type LIKE ? OR summary LIKE ? OR user_email LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * perPage;

    const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM audit_logs ${clause}`, params);
    const rows = await query(
      `SELECT * FROM audit_logs ${clause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    );

    const total = Number(totalRow.total);

    return {
      items: rows.map(mapLog),
      pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    };
  },

  /** Distinct actions, used to populate the filter dropdown. */
  async actions() {
    const rows = await query('SELECT DISTINCT action FROM audit_logs ORDER BY action ASC');
    return rows.map((row) => row.action);
  },
};

export default auditLogsRepository;
