import crypto from 'node:crypto';
import { query, queryOne } from '../config/db.js';
import { mapRow } from './catalogRepository.js';

export const hashStudentToken = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const studentRepository = {
  findByEmail(email) {
    return queryOne('SELECT * FROM students WHERE email = ? LIMIT 1', [email]);
  },
  async create({ name, email, phone, passwordHash }) {
    const result = await query('INSERT INTO students (name, email, phone, password_hash) VALUES (?, ?, ?, ?)', [name, email, phone, passwordHash]);
    return { id: result.insertId, name, email, phone };
  },
  async createSession(studentId) {
    const token = crypto.randomBytes(32).toString('hex');
    const csrfToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query('DELETE FROM student_sessions WHERE expires_at < NOW() AND student_id = ?', [studentId]);
    await query('INSERT INTO student_sessions (student_id, token_hash, csrf_hash, expires_at) VALUES (?, ?, ?, ?)', [studentId, hashStudentToken(token), hashStudentToken(csrfToken), expiresAt]);
    return { token, csrfToken, expiresAt };
  },
  resolveSession(token) {
    return queryOne(`SELECT s.id, s.name, s.email, s.phone, s.created_at, ss.csrf_hash
      FROM student_sessions ss JOIN students s ON s.id = ss.student_id
      WHERE ss.token_hash = ? AND ss.expires_at > NOW() LIMIT 1`, [hashStudentToken(token)]);
  },
  revokeSession(token) {
    return query('DELETE FROM student_sessions WHERE token_hash = ?', [hashStudentToken(token)]);
  },
  failedLogin(id) {
    return query(`UPDATE students SET failed_login_count = failed_login_count + 1,
      locked_until = IF(failed_login_count >= 5, DATE_ADD(NOW(), INTERVAL 15 MINUTE), locked_until) WHERE id = ?`, [id]);
  },
  clearLoginFailures(id) {
    return query('UPDATE students SET failed_login_count = 0, locked_until = NULL WHERE id = ?', [id]);
  },
  async enquiries(studentId) {
    // Select only student-visible fields; internal notes, assignees and lead
    // metadata never leave the CRM through this endpoint.
    const rows = await query(`SELECT id, service_interest, preferred_destination, message, status, preferred_date, preferred_time, created_at
      FROM enquiries WHERE student_id = ? AND anonymized_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 100`, [studentId]);
    return rows.map(mapRow);
  },
};
