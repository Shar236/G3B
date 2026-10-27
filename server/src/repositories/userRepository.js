import { query, queryOne, withTransaction } from '../config/db.js';
import { mapRow } from './catalogRepository.js';
import { enquiryFilters, sortClause } from '../utils/listFilters.js';
import ApiError from '../utils/ApiError.js';

const SORTABLE = {
  created_at: 'created_at',
  updated_at: 'updated_at',
  full_name: 'full_name',
  status: 'status',
  email: 'email',
};

export const usersRepository = {
  async findByEmail(email) {
    return queryOne('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
  },

  async findById(id) {
    const row = await queryOne(
      'SELECT id, name, email, role, status, last_login_at, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [id],
    );
    return row ? mapRow(row) : null;
  },

  async list() {
    const rows = await query(
      'SELECT id, name, email, role, status, last_login_at, created_at, updated_at FROM users ORDER BY created_at ASC',
    );
    return rows.map(mapRow);
  },

  async create({ name, email, passwordHash, role = 'staff', status = 'active' }) {
    const result = await query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, role, status],
    );
    return this.findById(result.insertId);
  },

  async update(id, { name, email, role, status, passwordHash }) {
    const assignments = [];
    const values = [];
    const map = { name, email, role, status, password_hash: passwordHash };
    for (const [column, value] of Object.entries(map)) {
      if (value !== undefined) {
        assignments.push(`${column} = ?`);
        values.push(value);
      }
    }
    const credentialsChanged = passwordHash !== undefined || role !== undefined || status !== undefined;
    if (credentialsChanged) assignments.push('auth_version = auth_version + 1');
    if (assignments.length > 0) {
      await withTransaction(async (connection) => {
        // Serialise demotion/disable with removal so concurrent requests cannot
        // both remove the final administrator.
        if (role !== undefined || status !== undefined) {
          const [admins] = await connection.execute("SELECT id FROM users WHERE role = 'admin' AND status = 'active' FOR UPDATE");
          if (admins.some((user) => Number(user.id) === Number(id)) && admins.length <= 1 && ((role && role !== 'admin') || (status && status !== 'active'))) {
            throw ApiError.badRequest('At least one active administrator must remain.');
          }
        }
        await connection.execute(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`, [...values, id]);
        if (credentialsChanged) await connection.execute('UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at,NOW()) WHERE user_id = ?', [id]);
      });
    }
    return this.findById(id);
  },

  async remove(id) {
    return withTransaction(async (connection) => {
      const [admins] = await connection.execute("SELECT id FROM users WHERE role = 'admin' AND status = 'active' FOR UPDATE");
      if (admins.length <= 1 && admins.some((user) => Number(user.id) === Number(id))) throw ApiError.badRequest('At least one active administrator must remain.');
      const [result] = await connection.execute('DELETE FROM users WHERE id = ?', [id]);
      return result.affectedRows > 0;
    });
  },

  async touchLastLogin(id) {
    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
  },

  /** Record a failed login and lock the account once the limit is reached. */
  async registerFailedLogin(id, { maxAttempts = 5, lockMinutes = 15 } = {}) {
    await query('UPDATE users SET failed_login_count = failed_login_count + 1 WHERE id = ?', [id]);
    const row = await queryOne('SELECT failed_login_count FROM users WHERE id = ? LIMIT 1', [id]);
    if (Number(row?.failed_login_count ?? 0) >= maxAttempts) {
      await query("UPDATE users SET locked_until = NOW() + (? * INTERVAL '1 minute') WHERE id = ?", [lockMinutes, id]);
    }
  },

  /** Clear the failure counter and any temporary lock after a good login. */
  async clearLoginFailures(id) {
    await query('UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?', [id]);
  },

  async countAdmins() {
    const row = await queryOne("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND status = 'active'");
    return Number(row.total);
  },
};

export const enquiriesRepository = {
  async create(data) {
    const result = await query(
      `INSERT INTO enquiries
         (full_name, email, phone, country_code, service_interest, preferred_destination, message, status, source, lead_source, landing_page, ip_address, current_status, target_degree, student_id, preferred_date, preferred_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.fullName,
        data.email,
        data.phone,
        data.countryCode ?? null,
        data.serviceInterest,
        data.preferredDestination ?? null,
        data.message ?? null,
        data.source ?? 'website',
        data.leadSource ?? null,
        data.landingPage ?? null,
        data.ipAddress ?? null,
        data.currentStatus || null,
        data.targetDegree || null,
        data.studentId ?? null,
        data.preferredDate || null,
        data.preferredTime || null,
      ],
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const row = await queryOne(
      `SELECT e.*, u.name AS assigned_to_name
       FROM enquiries e
       LEFT JOIN users u ON u.id = e.assigned_to
       WHERE e.id = ? LIMIT 1`,
      [id],
    );
    return row ? mapRow(row) : null;
  },

  /** Find a very recent duplicate submission (anti double-submit guard). */
  async findRecentDuplicate({ email, phone, minutes = 2 }) {
    const row = await queryOne(
      `SELECT id, created_at FROM enquiries
       WHERE email = ? AND phone = ? AND created_at > (NOW() - (? * INTERVAL '1 minute'))
       ORDER BY created_at DESC LIMIT 1`,
      [email, phone, minutes],
    );
    return row ? mapRow(row) : null;
  },

  async list({ page = 1, perPage = 20, ...filters } = {}) {
    const { clause, params } = enquiryFilters(filters);
    const order = sortClause(filters.sortBy, filters.sortDir, {
      createdAt: 'e.created_at', updatedAt: 'e.updated_at', fullName: 'e.full_name', email: 'e.email', status: 'e.status',
    });
    const offset = (page - 1) * perPage;

    const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM enquiries e ${clause}`, params);
    const rows = await query(
      `SELECT e.*, u.name AS assigned_to_name
       FROM enquiries e
       LEFT JOIN users u ON u.id = e.assigned_to
       ${clause}
       ORDER BY ${order.replace(', id DESC', ', e.id DESC')}
       LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    );

    const total = Number(totalRow.total);
    return {
      items: rows.map(mapRow),
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  },

  async listForExport(filters = {}) {
    const { clause, params } = enquiryFilters(filters);
    const order = sortClause(filters.sortBy, filters.sortDir, {
      createdAt: 'e.created_at', updatedAt: 'e.updated_at', fullName: 'e.full_name', email: 'e.email', status: 'e.status',
    });
    const rows = await query(
      `SELECT e.id, e.full_name, e.email, e.phone, e.country_code, e.service_interest,
              e.preferred_destination, e.message, e.status, e.lead_source, e.landing_page,
              e.follow_up_at, e.current_status, e.target_degree, u.name AS assigned_to_name, e.created_at, e.updated_at
       FROM enquiries e
       LEFT JOIN users u ON u.id = e.assigned_to
       ${clause}
       ORDER BY ${order.replace(', id DESC', ', e.id DESC')}`,
      params,
    );
    return rows.map(mapRow);
  },

  async update(id, payload) {
    const assignments = [];
    const values = [];
    const map = {
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      country_code: payload.countryCode,
      service_interest: payload.serviceInterest,
      preferred_destination: payload.preferredDestination,
      message: payload.message,
      status: payload.status,
      assigned_to: payload.assignedTo,
      lead_source: payload.leadSource,
      landing_page: payload.landingPage,
      follow_up_at: payload.followUpAt,
      current_status: payload.currentStatus,
      target_degree: payload.targetDegree,
    };
    for (const [column, value] of Object.entries(map)) {
      if (value !== undefined) {
        assignments.push(`${column} = ?`);
        values.push(value);
      }
    }
    if (assignments.length === 0) return this.findById(id);

    await query(`UPDATE enquiries SET ${assignments.join(', ')} WHERE id = ?`, [...values, id]);
    return this.findById(id);
  },

  async remove(id) {
    const result = await query('DELETE FROM enquiries WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async bulk({ ids, action, status }) {
    const uniqueIds = [...new Set(ids)];
    const placeholders = uniqueIds.map(() => '?').join(',');
    const result = action === 'delete'
      ? await query(`DELETE FROM enquiries WHERE id IN (${placeholders})`, uniqueIds)
      : await query(`UPDATE enquiries SET status = ? WHERE id IN (${placeholders})`, [status, ...uniqueIds]);
    return Number(result.affectedRows);
  },

  async statusCounts() {
    const rows = await query('SELECT status, COUNT(*) AS total FROM enquiries WHERE anonymized_at IS NULL GROUP BY status');
    const counts = { new: 0, contacted: 0, in_progress: 0, qualified: 0, converted: 0, completed: 0, closed: 0, archived: 0 };
    for (const row of rows) {
      counts[row.status] = Number(row.total);
    }
    counts.total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    return counts;
  },

  /** Enquiries grouped by the service a visitor asked about. */
  async countByService() {
    const rows = await query(
      `SELECT service_interest AS label, COUNT(*) AS total
       FROM enquiries WHERE anonymized_at IS NULL
       GROUP BY service_interest ORDER BY total DESC LIMIT 20`,
    );
    return rows.map((row) => ({ label: row.label || 'Unspecified', total: Number(row.total) }));
  },

  /** Enquiries grouped by captured lead source. */
  async countByLeadSource() {
    const rows = await query(
      `SELECT COALESCE(lead_source, source, 'website') AS label, COUNT(*) AS total
       FROM enquiries WHERE anonymized_at IS NULL
       GROUP BY label ORDER BY total DESC LIMIT 20`,
    );
    return rows.map((row) => ({ label: row.label, total: Number(row.total) }));
  },

  /**
   * Dashboard notification count: enquiries that still need attention
   * ("New" or "In progress") and have not been anonymised.
   */
  async attentionCount() {
    const row = await queryOne(
      "SELECT COUNT(*) AS total FROM enquiries WHERE status IN ('new','in_progress') AND anonymized_at IS NULL",
    );
    return Number(row.total);
  },

  /** Enquiries with a follow-up date due on or before `days` from now. */
  async dueFollowUps(days = 7, limit = 10) {
    const rows = await query(
      `SELECT e.id, e.full_name, e.email, e.status, e.follow_up_at, u.name AS assigned_to_name
       FROM enquiries e
       LEFT JOIN users u ON u.id = e.assigned_to
       WHERE e.follow_up_at IS NOT NULL AND e.anonymized_at IS NULL
         AND e.follow_up_at <= (NOW() + (? * INTERVAL '1 day'))
       ORDER BY e.follow_up_at ASC LIMIT ?`,
      [days, limit],
    );
    return rows.map(mapRow);
  },

  /**
   * Retention-policy erasure: strip the personally identifiable fields while
   * keeping the row so aggregate reporting stays accurate.
   */
  async anonymize(id) {
    await query(
      `UPDATE enquiries
       SET full_name = 'Anonymised enquirer',
           email = CONCAT('anonymised+', id, '@invalid.local'),
           phone = '',
           country_code = NULL,
           message = NULL,
           ip_address = NULL,
           anonymized_at = NOW()
       WHERE id = ?`,
      [id],
    );
    return this.findById(id);
  },

  // --- Internal notes (never exposed on public endpoints) -------------------
  async listNotes(enquiryId) {
    const rows = await query(
      `SELECT n.id, n.enquiry_id, n.note, n.created_at, n.author_id, u.name AS author_name
       FROM enquiry_notes n
       LEFT JOIN users u ON u.id = n.author_id
       WHERE n.enquiry_id = ? ORDER BY n.created_at DESC`,
      [enquiryId],
    );
    return rows.map(mapRow);
  },

  async addNote(enquiryId, note, authorId) {
    const result = await query(
      'INSERT INTO enquiry_notes (enquiry_id, note, author_id) VALUES (?, ?, ?)',
      [enquiryId, note, authorId ?? null],
    );
    const rows = await query(
      `SELECT n.id, n.enquiry_id, n.note, n.created_at, n.author_id, u.name AS author_name
       FROM enquiry_notes n LEFT JOIN users u ON u.id = n.author_id
       WHERE n.id = ? LIMIT 1`,
      [result.insertId],
    );
    return rows.length > 0 ? mapRow(rows[0]) : null;
  },

  async removeNote(enquiryId, noteId) {
    const result = await query('DELETE FROM enquiry_notes WHERE id = ? AND enquiry_id = ?', [noteId, enquiryId]);
    return result.affectedRows > 0;
  },

  async recent(limit = 5) {
    const rows = await query(
      `SELECT e.id, e.full_name, e.email, e.service_interest, e.status, e.created_at
       FROM enquiries e
       ORDER BY e.created_at DESC
       LIMIT ?`,
      [limit],
    );
    return rows.map(mapRow);
  },

  async countSince(days = 7) {
    const row = await queryOne(
      "SELECT COUNT(*) AS total FROM enquiries WHERE created_at > (NOW() - (? * INTERVAL '1 day'))",
      [days],
    );
    return Number(row.total);
  },
};

export const notificationsRepository = {
  async enqueue({ enquiryId, recipient, subject, body, kind, status = 'pending', lastError = null }) {
    const result = await query(
      `INSERT INTO enquiry_notifications (enquiry_id, recipient, subject, body, kind, status, attempts, last_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [enquiryId, recipient, subject, body, kind, status, status === 'sent' ? 1 : 0, lastError],
    );
    return result.insertId;
  },

  async pending(limit = 20) {
    return query(
      "SELECT * FROM enquiry_notifications WHERE status IN ('pending', 'failed') AND attempts < 5 ORDER BY created_at ASC LIMIT ?",
      [limit],
    );
  },

  async markSent(id) {
    await query("UPDATE enquiry_notifications SET status = 'sent', attempts = attempts + 1, sent_at = NOW(), last_error = NULL WHERE id = ?", [
      id,
    ]);
  },

  async markFailed(id, error) {
    await query("UPDATE enquiry_notifications SET status = 'failed', attempts = attempts + 1, last_error = ? WHERE id = ?", [
      String(error).slice(0, 1000),
      id,
    ]);
  },
};

export { SORTABLE };
export default { usersRepository, enquiriesRepository, notificationsRepository };
