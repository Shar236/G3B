import { query, queryOne } from '../config/db.js';
import { mapRow } from './catalogRepository.js';

export const assessmentRepository = {
  async catalogue({ activeOnly = true } = {}) {
    const rows = await query(`SELECT * FROM assessment_listings${activeOnly ? ' WHERE is_active = 1' : ''} ORDER BY sort_order ASC, id ASC`);
    return rows.map(mapRow);
  },
  async findListing(id, { activeOnly = true } = {}) {
    const row = await queryOne(`SELECT * FROM assessment_listings WHERE id = ?${activeOnly ? ' AND is_active = 1' : ''} LIMIT 1`, [id]);
    return row ? mapRow(row) : null;
  },
  async request(studentId, assessmentId) {
    await query(`INSERT INTO student_assessments (student_id, assessment_id) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE updated_at = updated_at`, [studentId, assessmentId]);
    return this.findStudentAssignment(studentId, assessmentId);
  },
  async findStudentAssignment(studentId, assessmentId) {
    const row = await queryOne(`SELECT sa.*, a.title, a.slug, a.category, a.summary, a.access_mode, a.launch_url
      FROM student_assessments sa JOIN assessment_listings a ON a.id = sa.assessment_id
      WHERE sa.student_id = ? AND sa.assessment_id = ? LIMIT 1`, [studentId, assessmentId]);
    return row ? mapRow(row) : null;
  },
  async studentAssignments(studentId) {
    const rows = await query(`SELECT sa.*, a.title, a.slug, a.category, a.summary, a.access_mode, a.launch_url
      FROM student_assessments sa JOIN assessment_listings a ON a.id = sa.assessment_id
      WHERE sa.student_id = ? ORDER BY sa.updated_at DESC, sa.id DESC`, [studentId]);
    return rows.map(mapRow);
  },
  async listAssignments() {
    const rows = await query(`SELECT sa.*, a.title, a.category, s.name AS student_name, s.email AS student_email
      FROM student_assessments sa JOIN assessment_listings a ON a.id = sa.assessment_id JOIN students s ON s.id = sa.student_id
      ORDER BY sa.updated_at DESC, sa.id DESC LIMIT 500`);
    return rows.map(mapRow);
  },
  async updateAssignment(id, payload) {
    const fields = { status: payload.status, progress_percent: payload.progressPercent, recommendation: payload.recommendation, report_file_name: payload.reportFileName, report_original_name: payload.reportOriginalName };
    const entries = Object.entries(fields).filter(([,value]) => value !== undefined);
    if (entries.length) await query(`UPDATE student_assessments SET ${entries.map(([key])=>`${key} = ?`).join(', ')}, started_at = IF(? = 'in_progress' AND started_at IS NULL, NOW(), started_at), completed_at = IF(? = 'completed', NOW(), completed_at) WHERE id = ?`, [...entries.map(([,value])=>value), payload.status || '', payload.status || '', id]);
    const row = await queryOne(`SELECT sa.*, a.title, s.name AS student_name, s.email AS student_email FROM student_assessments sa JOIN assessment_listings a ON a.id=sa.assessment_id JOIN students s ON s.id=sa.student_id WHERE sa.id=?`, [id]);
    return row ? mapRow(row) : null;
  },
  async assignmentForStudent(id, studentId) {
    const row = await queryOne('SELECT * FROM student_assessments WHERE id = ? AND student_id = ? LIMIT 1', [id, studentId]);
    return row ? mapRow(row) : null;
  },
};

export default assessmentRepository;
