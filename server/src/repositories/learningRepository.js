import { pool } from '../config/db.js';

const summary = `SELECT a.id,a.title,a.description,a.instructions,a.category,a.due_at,a.status,
  a.created_at,a.updated_at,
  (SELECT count(*)::int FROM learning_assignment_targets t WHERE t.assignment_id=a.id) AS assigned_count,
  (SELECT count(*)::int FROM learning_submissions s WHERE s.assignment_id=a.id) AS submitted_count
  FROM learning_assignments a`;

export const learningRepository = {
  async listAdmin() {
    const { rows } = await pool.query(`${summary} ORDER BY a.created_at DESC,a.id DESC LIMIT 200`);
    return rows;
  },
  async findAdmin(id) {
    const { rows } = await pool.query(`${summary} WHERE a.id=$1`, [id]);
    return rows[0] || null;
  },
  async create(data, userId) {
    const { rows } = await pool.query(`INSERT INTO learning_assignments
      (title,description,instructions,category,due_at,status,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [data.title, data.description || '', data.instructions || '', data.category || 'general', data.dueAt || null, data.status || 'draft', userId]);
    return this.findAdmin(rows[0].id);
  },
  async update(id, data) {
    const { rows } = await pool.query(`UPDATE learning_assignments SET
      title=$2,description=$3,instructions=$4,category=$5,due_at=$6,status=$7,updated_at=now()
      WHERE id=$1 RETURNING id`,
    [id, data.title, data.description || '', data.instructions || '', data.category || 'general', data.dueAt || null, data.status]);
    return rows[0] ? this.findAdmin(id) : null;
  },
  async remove(id) {
    return (await pool.query('DELETE FROM learning_assignments WHERE id=$1', [id])).rowCount > 0;
  },
  async students() {
    return (await pool.query('SELECT id,name,email,phone,created_at FROM students ORDER BY name,id LIMIT 1000')).rows;
  },
  async targets(id) {
    return (await pool.query(`SELECT s.id,s.name,s.email,t.assigned_at,t.viewed_at,
      sub.submitted_at,sub.reviewed_at FROM learning_assignment_targets t
      JOIN students s ON s.id=t.student_id
      LEFT JOIN learning_submissions sub ON sub.assignment_id=t.assignment_id AND sub.student_id=t.student_id
      WHERE t.assignment_id=$1 ORDER BY s.name,s.id`, [id])).rows;
  },
  async assign(id, studentIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const exists = await client.query('SELECT id FROM learning_assignments WHERE id=$1 FOR UPDATE', [id]);
      if (!exists.rowCount) { await client.query('ROLLBACK'); return null; }
      const valid = await client.query('SELECT id,email,name FROM students WHERE id=ANY($1::int[])', [studentIds]);
      if (valid.rowCount !== studentIds.length) { await client.query('ROLLBACK'); return { invalid: true }; }
      const newlyAssigned = [];
      for (const studentId of studentIds) {
        const inserted = await client.query(`INSERT INTO learning_assignment_targets (assignment_id,student_id)
          VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING student_id`, [id, studentId]);
        if (inserted.rowCount) newlyAssigned.push(studentId);
      }
      await client.query('COMMIT');
      return { students: valid.rows, newlyAssigned };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  },
  async files(id) {
    return (await pool.query(`SELECT id,filename,mime_type,size_bytes,created_at
      FROM learning_assignment_files WHERE assignment_id=$1 ORDER BY id`, [id])).rows;
  },
  async addFile(id, file) {
    const { rows } = await pool.query(`INSERT INTO learning_assignment_files
      (assignment_id,filename,mime_type,content,size_bytes)
      VALUES ($1,$2,$3,$4,$5) RETURNING id,filename,mime_type,size_bytes,created_at`,
    [id, file.originalname, file.mimetype, file.buffer, file.size]);
    return rows[0];
  },
  async deleteFile(id, assignmentId) {
    return (await pool.query('DELETE FROM learning_assignment_files WHERE id=$1 AND assignment_id=$2', [id, assignmentId])).rowCount > 0;
  },
  async adminFile(id) {
    return (await pool.query('SELECT filename,mime_type,content FROM learning_assignment_files WHERE id=$1', [id])).rows[0] || null;
  },
  async studentFile(fileId, studentId) {
    return (await pool.query(`SELECT f.filename,f.mime_type,f.content FROM learning_assignment_files f
      JOIN learning_assignments a ON a.id=f.assignment_id
      JOIN learning_assignment_targets t ON t.assignment_id=a.id AND t.student_id=$2
      WHERE f.id=$1 AND a.status='published'`, [fileId, studentId])).rows[0] || null;
  },
  async studentList(studentId) {
    return (await pool.query(`SELECT a.id,a.title,a.description,a.instructions,a.category,a.due_at,
      t.assigned_at,t.viewed_at,sub.submitted_at,sub.feedback,sub.marks,sub.reviewed_at
      FROM learning_assignment_targets t JOIN learning_assignments a ON a.id=t.assignment_id
      LEFT JOIN learning_submissions sub ON sub.assignment_id=a.id AND sub.student_id=t.student_id
      WHERE t.student_id=$1 AND a.status='published'
      ORDER BY a.due_at NULLS LAST,t.assigned_at DESC`, [studentId])).rows;
  },
  async studentDetail(id, studentId) {
    const { rows } = await pool.query(`SELECT a.id,a.title,a.description,a.instructions,a.category,a.due_at,
      t.assigned_at,t.viewed_at,sub.submitted_at,sub.feedback,sub.marks,sub.reviewed_at
      FROM learning_assignments a JOIN learning_assignment_targets t
      ON t.assignment_id=a.id AND t.student_id=$2
      LEFT JOIN learning_submissions sub ON sub.assignment_id=a.id AND sub.student_id=$2
      WHERE a.id=$1 AND a.status='published'`, [id, studentId]);
    return rows[0] || null;
  },
  async markViewed(id, studentId) {
    await pool.query('UPDATE learning_assignment_targets SET viewed_at=COALESCE(viewed_at,now()) WHERE assignment_id=$1 AND student_id=$2', [id, studentId]);
  },
  async submit(id, studentId, file) {
    const { rows } = await pool.query(`INSERT INTO learning_submissions
      (assignment_id,student_id,filename,mime_type,content,size_bytes)
      SELECT a.id,$2,$3,$4,$5,$6 FROM learning_assignments a
      JOIN learning_assignment_targets t ON t.assignment_id=a.id AND t.student_id=$2
      WHERE a.id=$1 AND a.status='published'
      ON CONFLICT (assignment_id,student_id) DO UPDATE SET
      filename=EXCLUDED.filename,mime_type=EXCLUDED.mime_type,content=EXCLUDED.content,
      size_bytes=EXCLUDED.size_bytes,submitted_at=now(),feedback=NULL,marks=NULL,reviewed_at=NULL
      RETURNING id,submitted_at`,
    [id, studentId, file.originalname, file.mimetype, file.buffer, file.size]);
    return rows[0] || null;
  },
  async submissions(id) {
    return (await pool.query(`SELECT sub.id,sub.student_id,s.name,s.email,sub.filename,sub.size_bytes,
      sub.submitted_at,sub.feedback,sub.marks,sub.reviewed_at FROM learning_submissions sub
      JOIN students s ON s.id=sub.student_id WHERE sub.assignment_id=$1
      ORDER BY sub.submitted_at DESC`, [id])).rows;
  },
  async submissionFile(id) {
    return (await pool.query('SELECT filename,mime_type,content FROM learning_submissions WHERE id=$1', [id])).rows[0] || null;
  },
  async review(id, feedback, marks) {
    return (await pool.query(`UPDATE learning_submissions SET feedback=$2,marks=$3,reviewed_at=now()
      WHERE id=$1 RETURNING id,assignment_id,student_id,feedback,marks,reviewed_at`,
    [id, feedback || null, marks || null])).rows[0] || null;
  },
  async announcements() {
    return (await pool.query('SELECT id,title,body,status,published_at,created_at FROM learning_announcements ORDER BY created_at DESC LIMIT 100')).rows;
  },
  async studentAnnouncements() {
    return (await pool.query("SELECT id,title,body,published_at FROM learning_announcements WHERE status='published' ORDER BY published_at DESC LIMIT 20")).rows;
  },
  async createAnnouncement(data, userId) {
    return (await pool.query(`INSERT INTO learning_announcements(title,body,status,created_by,published_at)
      VALUES ($1,$2,$3,$4,CASE WHEN $3='published' THEN now() ELSE NULL END)
      RETURNING id,title,body,status,published_at,created_at`,
    [data.title,data.body,data.status || 'draft',userId])).rows[0];
  },
  async updateAnnouncement(id, data) {
    return (await pool.query(`UPDATE learning_announcements SET title=$2,body=$3,status=$4,
      published_at=CASE WHEN $4='published' THEN COALESCE(published_at,now()) ELSE published_at END
      WHERE id=$1 RETURNING id,title,body,status,published_at,created_at`,
    [id,data.title,data.body,data.status])).rows[0] || null;
  },
};
