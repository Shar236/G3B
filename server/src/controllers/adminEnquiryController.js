import { enquiriesRepository, usersRepository } from '../repositories/userRepository.js';
import { recordAudit } from '../services/auditLog.js';
import ApiError from '../utils/ApiError.js';
import toCsv from '../utils/csv.js';

const CSV_COLUMNS = [
  'id',
  'fullName',
  'email',
  'phone',
  'countryCode',
  'serviceInterest',
  'preferredDestination',
  'message',
  'status',
  'leadSource',
  'landingPage',
  'followUpAt',
  'assignedToName',
  'createdAt',
  'updatedAt',
];

/** GET /api/admin/enquiries */
export async function listEnquiries(req, res) {
  const page = Number.parseInt(req.query.page, 10) || 1;
  const perPage = Math.min(Number.parseInt(req.query.perPage, 10) || 20, 100);

  const result = await enquiriesRepository.list({
    page,
    perPage,
    status: req.query.status || undefined,
    search: req.query.search || undefined,
    assignedTo: req.query.assignedTo || undefined,
    service: req.query.service || undefined,
    destination: req.query.destination || undefined,
    leadSource: req.query.leadSource || undefined,
    dateFrom: req.query.dateFrom || undefined,
    dateTo: req.query.dateTo || undefined,
    includeAnonymized: req.query.includeAnonymized === 'true',
  });

  res.json({ success: true, data: result.items, pagination: result.pagination });
}

/** GET /api/admin/enquiries/stats */
export async function enquiryStats(_req, res) {
  const [counts, last7Days, recent, assignees, byService, byLeadSource, attentionCount, dueFollowUps] =
    await Promise.all([
      enquiriesRepository.statusCounts(),
      enquiriesRepository.countSince(7),
      enquiriesRepository.recent(5),
      usersRepository.list(),
      enquiriesRepository.countByService(),
      enquiriesRepository.countByLeadSource(),
      enquiriesRepository.attentionCount(),
      enquiriesRepository.dueFollowUps(7),
    ]);

  res.json({
    success: true,
    data: {
      counts,
      last7Days,
      recent,
      byService,
      byLeadSource,
      attentionCount,
      dueFollowUps,
      assignees: assignees.map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role })),
    },
  });
}

/** GET /api/admin/enquiries/:id */
export async function getEnquiry(req, res) {
  const enquiry = await enquiriesRepository.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found.');
  const notes = await enquiriesRepository.listNotes(enquiry.id);
  res.json({ success: true, data: { ...enquiry, notes } });
}

/** PATCH /api/admin/enquiries/:id */
export async function updateEnquiry(req, res) {
  const existing = await enquiriesRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Enquiry not found.');

  if (req.body.assignedTo) {
    const assignee = await usersRepository.findById(req.body.assignedTo);
    if (!assignee) throw ApiError.badRequest('The selected assignee does not exist.');
  }

  const updated = await enquiriesRepository.update(req.params.id, req.body);
  await recordAudit(req, {
    action: 'enquiry.update',
    entityType: 'enquiry',
    entityId: existing.id,
    summary: `Updated enquiry #${existing.id}`,
    changes: req.body,
  });
  res.json({ success: true, data: updated });
}

/**
 * POST /api/admin/enquiries/:id/anonymize
 * Applies the retention policy: personally identifiable fields are erased but
 * the row is kept so reporting totals stay correct.
 */
export async function anonymizeEnquiry(req, res) {
  const existing = await enquiriesRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Enquiry not found.');
  if (existing.anonymizedAt) throw ApiError.badRequest('This enquiry is already anonymised.');

  const anonymized = await enquiriesRepository.anonymize(existing.id);
  await recordAudit(req, {
    action: 'enquiry.anonymize',
    entityType: 'enquiry',
    entityId: existing.id,
    summary: `Anonymised enquiry #${existing.id} under the retention policy`,
  });
  res.json({ success: true, data: anonymized });
}

/** DELETE /api/admin/enquiries/:id */
export async function deleteEnquiry(req, res) {
  const existing = await enquiriesRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Enquiry not found.');

  await enquiriesRepository.remove(existing.id);
  await recordAudit(req, {
    action: 'enquiry.delete',
    entityType: 'enquiry',
    entityId: existing.id,
    summary: `Deleted enquiry #${existing.id}`,
  });
  res.json({ success: true, data: { message: 'Enquiry deleted.' } });
}

// --- Internal notes ---------------------------------------------------------
// These are admin-only: no public endpoint ever returns them.

/** GET /api/admin/enquiries/:id/notes */
export async function listEnquiryNotes(req, res) {
  const existing = await enquiriesRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Enquiry not found.');
  res.json({ success: true, data: await enquiriesRepository.listNotes(existing.id) });
}

/** POST /api/admin/enquiries/:id/notes */
export async function addEnquiryNote(req, res) {
  const existing = await enquiriesRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Enquiry not found.');

  const note = await enquiriesRepository.addNote(existing.id, req.body.note, req.user.id);
  await recordAudit(req, {
    action: 'enquiry.note.add',
    entityType: 'enquiry',
    entityId: existing.id,
    summary: `Added an internal note to enquiry #${existing.id}`,
  });
  res.status(201).json({ success: true, data: note });
}

/** DELETE /api/admin/enquiries/:id/notes/:noteId */
export async function deleteEnquiryNote(req, res) {
  const existing = await enquiriesRepository.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Enquiry not found.');

  const removed = await enquiriesRepository.removeNote(existing.id, req.params.noteId);
  if (!removed) throw ApiError.notFound('Note not found.');

  await recordAudit(req, {
    action: 'enquiry.note.delete',
    entityType: 'enquiry',
    entityId: existing.id,
    summary: `Deleted an internal note from enquiry #${existing.id}`,
  });
  res.json({ success: true, data: { message: 'Note deleted.' } });
}

/** GET /api/admin/enquiries/export - CSV download of authorised data */
export async function exportEnquiries(req, res) {
  const rows = await enquiriesRepository.listForExport({
    status: req.query.status || undefined,
    search: req.query.search || undefined,
  });

  const csv = toCsv(rows, CSV_COLUMNS);
  const filename = `g3b-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

export default {
  listEnquiries,
  enquiryStats,
  getEnquiry,
  updateEnquiry,
  anonymizeEnquiry,
  deleteEnquiry,
  listEnquiryNotes,
  addEnquiryNote,
  deleteEnquiryNote,
  exportEnquiries,
};
