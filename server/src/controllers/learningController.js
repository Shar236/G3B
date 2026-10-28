import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { learningRepository as repo } from '../repositories/learningRepository.js';
import { studentRepository } from '../repositories/studentRepository.js';
import { clearStudentCookies, STUDENT_COOKIE } from '../middleware/studentAuth.js';
import { recordAudit } from '../services/auditLog.js';
import ApiError from '../utils/ApiError.js';
import { queueAssignmentNotifications, retryLearningNotifications, listLearningNotifications } from '../services/learningNotifications.js';
import crypto from 'node:crypto';
import path from 'node:path';
import env from '../config/env.js';
import { createSignedUploadUrl, downloadObject, deleteObjects, storageBuckets } from '../services/supabaseStorage.js';
import logger from '../utils/logger.js';

const data = (res, value, status = 200) => res.status(status).json({ success: true, data: value });
const required = (value, label) => value || (() => { throw ApiError.notFound(`${label} not found.`); })();
const pdf = (req) => {
  if (!req.file) throw ApiError.badRequest('Choose a PDF file.');
  if (req.file.buffer.subarray(0, 5).toString() !== '%PDF-') throw ApiError.badRequest('The uploaded file is not a valid PDF.');
  return req.file;
};
async function storedPdf(body, keyPrefix) {
  const key = body.storageKey;
  const originalName = body.originalName;
  if (typeof key !== 'string' || !key.startsWith(keyPrefix) || path.extname(originalName || '').toLowerCase() !== '.pdf') {
    throw ApiError.badRequest('The uploaded PDF reference is invalid.');
  }
  const { buffer, contentType } = await downloadObject(storageBuckets.private, key, {
    maxBytes: Math.min(env.uploads.maxBytes, 10 * 1024 * 1024),
  });
  if (contentType !== 'application/pdf' || buffer.subarray(0, 5).toString() !== '%PDF-') {
    throw ApiError.badRequest('The uploaded file is not a valid PDF.');
  }
  return {
    storageKey: key,
    file: { buffer, originalname: originalName, mimetype: contentType, size: buffer.length },
  };
}
async function removeStagedObject(key) {
  try {
    await deleteObjects(storageBuckets.private, [key]);
  } catch (error) {
    logger.warn('Could not remove a processed private upload', { status: error.status || 502 });
  }
}
const sendFile = (res, file) => {
  const filename = file.filename.replace(/[\r\n"\\]/g, '_');
  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(file.content);
};

export async function listStudents(_req, res) { data(res, await repo.students()); }
export async function listAssignments(_req, res) { data(res, await repo.listAdmin()); }
export async function getAssignment(req, res) {
  const item = required(await repo.findAdmin(req.params.id), 'Assignment');
  data(res, { ...item, targets: await repo.targets(item.id), files: await repo.files(item.id), submissions: await repo.submissions(item.id) });
}
export async function createAssignment(req, res) {
  const item = await repo.create(req.body, req.user.id);
  await recordAudit(req, { action: 'learning.assignment.create', entityType: 'learning_assignment', entityId: item.id });
  data(res, item, 201);
}
export async function updateAssignment(req, res) {
  const existing = required(await repo.findAdmin(req.params.id), 'Assignment');
  const item = await repo.update(existing.id, { ...existing, ...req.body });
  if (existing.status !== 'published' && item.status === 'published') {
    await queueAssignmentNotifications(item, await repo.targets(item.id));
  }
  await recordAudit(req, { action: 'learning.assignment.update', entityType: 'learning_assignment', entityId: item.id });
  data(res, item);
}
export async function deleteAssignment(req, res) {
  if (!await repo.remove(req.params.id)) throw ApiError.notFound('Assignment not found.');
  await recordAudit(req, { action: 'learning.assignment.delete', entityType: 'learning_assignment', entityId: req.params.id });
  data(res, { deleted: true });
}
export async function assignStudents(req, res) {
  const ids = [...new Set(req.body.studentIds.map(Number))];
  const result = await repo.assign(req.params.id, ids);
  if (!result) throw ApiError.notFound('Assignment not found.');
  if (result.invalid) throw ApiError.badRequest('One or more students were not found.');
  const assignment = await repo.findAdmin(req.params.id);
  await queueAssignmentNotifications(assignment, result.students.filter((student) => result.newlyAssigned.includes(student.id)));
  await recordAudit(req, { action: 'learning.assignment.assign', entityType: 'learning_assignment', entityId: req.params.id, summary: `Assigned to ${ids.length} students` });
  data(res, await repo.targets(req.params.id));
}
export async function addAssignmentFile(req, res) {
  required(await repo.findAdmin(req.params.id), 'Assignment');
  const uploaded = req.body?.storageKey
    ? await storedPdf(req.body, `learning/${req.params.id}/`)
    : { file: pdf(req), storageKey: null };
  const file = await repo.addFile(req.params.id, uploaded.file);
  if (uploaded.storageKey) await removeStagedObject(uploaded.storageKey);
  await recordAudit(req, { action: 'learning.file.upload', entityType: 'learning_assignment', entityId: req.params.id, summary: file.filename });
  data(res, file, 201);
}
export async function deleteAssignmentFile(req, res) {
  if (!await repo.deleteFile(req.params.fileId, req.params.id)) throw ApiError.notFound('File not found.');
  await recordAudit(req, { action: 'learning.file.delete', entityType: 'learning_assignment', entityId: req.params.id });
  data(res, { deleted: true });
}
export async function downloadAdminFile(req, res) { sendFile(res, required(await repo.adminFile(req.params.fileId), 'File')); }
export async function downloadSubmission(req, res) { sendFile(res, required(await repo.submissionFile(req.params.submissionId), 'Submission')); }
export async function reviewSubmission(req, res) {
  const item = required(await repo.review(req.params.submissionId, req.body.feedback, req.body.marks), 'Submission');
  await recordAudit(req, { action: 'learning.submission.review', entityType: 'learning_submission', entityId: item.id });
  data(res, item);
}
export async function listAnnouncements(_req, res) { data(res, await repo.announcements()); }
export async function createAnnouncement(req, res) {
  const item = await repo.createAnnouncement(req.body, req.user.id);
  await recordAudit(req, { action: 'learning.announcement.create', entityType: 'learning_announcement', entityId: item.id });
  data(res, item, 201);
}
export async function updateAnnouncement(req, res) {
  const item = required(await repo.updateAnnouncement(req.params.id, req.body), 'Announcement');
  await recordAudit(req, { action: 'learning.announcement.update', entityType: 'learning_announcement', entityId: item.id });
  data(res, item);
}
export async function notificationStatus(_req, res) { data(res, await listLearningNotifications()); }
export async function retryNotifications(_req, res) { data(res, await retryLearningNotifications()); }

export async function studentAssignments(req, res) {
  const [assignments, announcements] = await Promise.all([repo.studentList(req.student.id), repo.studentAnnouncements()]);
  data(res, { assignments, announcements });
}
export async function studentAssignment(req, res) {
  const item = required(await repo.studentDetail(req.params.id, req.student.id), 'Assignment');
  await repo.markViewed(item.id, req.student.id);
  data(res, { ...item, files: await repo.files(item.id) });
}
export async function downloadStudentFile(req, res) {
  sendFile(res, required(await repo.studentFile(req.params.fileId, req.student.id), 'File'));
}
export async function submitAssignment(req, res) {
  const uploaded = req.body?.storageKey
    ? await storedPdf(req.body, `submissions/${req.params.id}/${req.student.id}/`)
    : { file: pdf(req), storageKey: null };
  const item = await repo.submit(req.params.id, req.student.id, uploaded.file);
  if (!item) {
    if (uploaded.storageKey) await removeStagedObject(uploaded.storageKey);
    throw ApiError.notFound('Assignment not found.');
  }
  if (uploaded.storageKey) await removeStagedObject(uploaded.storageKey);
  data(res, item, 201);
}

export async function createSubmissionUploadUrl(req, res) {
  required(await repo.studentDetail(req.params.id, req.student.id), 'Assignment');
  const originalName = req.body?.originalName;
  const contentType = req.body?.contentType;
  const size = Number(req.body?.size);
  if (typeof originalName !== 'string' || path.extname(originalName).toLowerCase() !== '.pdf') {
    throw ApiError.badRequest('Choose a PDF file.');
  }
  if (contentType !== 'application/pdf') throw ApiError.badRequest('Only PDF files are supported.');
  if (!Number.isSafeInteger(size) || size < 1 || size > Math.min(env.uploads.maxBytes, 10 * 1024 * 1024)) {
    throw ApiError.badRequest('The selected PDF exceeds the upload limit.');
  }
  const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'submission.pdf';
  const key = `submissions/${req.params.id}/${req.student.id}/${crypto.randomUUID()}-${safeName}`;
  const ticket = await createSignedUploadUrl(storageBuckets.private, key);
  data(res, { ...ticket, originalName, contentType, size });
}
export async function updateProfile(req, res) {
  const { rows } = await pool.query('UPDATE students SET name=$2,phone=$3 WHERE id=$1 RETURNING id,name,email,phone', [req.student.id, req.body.name, req.body.phone]);
  data(res, rows[0]);
}
export async function changePassword(req, res) {
  const { rows } = await pool.query('SELECT password_hash FROM students WHERE id=$1', [req.student.id]);
  if (!rows[0] || !await bcrypt.compare(req.body.currentPassword, rows[0].password_hash)) throw ApiError.badRequest('Current password is incorrect.');
  const hash = await bcrypt.hash(req.body.newPassword, 12);
  await pool.query('UPDATE students SET password_hash=$2 WHERE id=$1', [req.student.id, hash]);
  await studentRepository.revokeSession(req.cookies[STUDENT_COOKIE]);
  clearStudentCookies(res);
  data(res, { message: 'Password changed. Please sign in again.' });
}
