import { pool } from '../config/db.js';
import { sendMail } from './mailer.js';
import { settingsRepository } from '../repositories/settingsRepository.js';

const expand = (template, values) => String(template).replace(/\{\{(student|assignment|dueDate)\}\}/g, (_, key) => values[key]);

export async function queueAssignmentNotifications(assignment, students) {
  if (assignment.status !== 'published' || !students.length) return [];
  const settings = await settingsRepository.all();
  const subjectTemplate = settings.assignment_email_subject || 'New assignment: {{assignment}}';
  const bodyTemplate = settings.assignment_email_body || 'Hello {{student}},\n\nA new assignment, {{assignment}}, is available in your G3B student dashboard.\nDue: {{dueDate}}\n\nSign in to view your instructions and private files.';
  const inserted = [];
  for (const student of students) {
    const values = {
      student: student.name,
      assignment: assignment.title,
      dueDate: assignment.due_at ? new Date(assignment.due_at).toLocaleDateString('en-IN') : 'No deadline',
    };
    const { rows } = await pool.query(`INSERT INTO learning_notifications
      (assignment_id,student_id,recipient,subject,body)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (assignment_id,student_id) DO NOTHING
      RETURNING id,recipient,subject,body`,
    [assignment.id, student.id, student.email, expand(subjectTemplate, values), expand(bodyTemplate, values)]);
    if (rows[0]) inserted.push(rows[0]);
  }
  for (const row of inserted) await deliver(row);
  return inserted.map((row) => row.id);
}

async function deliver(row) {
  const result = await sendMail({ to: row.recipient, subject: row.subject, text: row.body });
  await pool.query(`UPDATE learning_notifications SET status=$2::varchar,attempts=attempts+1,
    last_error=$3,sent_at=CASE WHEN $2::varchar='sent' THEN now() ELSE sent_at END WHERE id=$1`,
  [row.id, result.sent ? 'sent' : 'failed', result.sent ? null : result.error || 'Delivery failed']);
  return result;
}

export async function retryLearningNotifications(limit = 50) {
  const { rows } = await pool.query(`SELECT id,recipient,subject,body FROM learning_notifications
    WHERE status IN ('pending','failed') AND attempts < 5 ORDER BY created_at LIMIT $1`, [limit]);
  const result = { attempted: rows.length, sent: 0, failed: 0 };
  for (const row of rows) {
    const delivery = await deliver(row);
    result[delivery.sent ? 'sent' : 'failed'] += 1;
  }
  return result;
}

export async function listLearningNotifications() {
  return (await pool.query(`SELECT n.id,n.assignment_id,n.student_id,n.recipient,n.status,n.attempts,
    n.last_error,n.sent_at,n.created_at,a.title AS assignment_title
    FROM learning_notifications n JOIN learning_assignments a ON a.id=n.assignment_id
    ORDER BY n.created_at DESC LIMIT 200`)).rows;
}
