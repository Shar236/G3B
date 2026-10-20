import { auditLogsRepository } from '../repositories/auditLogsRepository.js';

/** Read-only audit trail. Entries are written by `services/auditLog.js`. */

/** GET /api/admin/audit-logs */
export async function listAuditLogs(req, res) {
  const page = Number.parseInt(req.query.page, 10) || 1;
  const perPage = Math.min(Number.parseInt(req.query.perPage, 10) || 50, 200);

  const result = await auditLogsRepository.list({
    page,
    perPage,
    action: req.query.action || undefined,
    entityType: req.query.entityType || undefined,
    userId: req.query.userId || undefined,
    search: req.query.search || undefined,
  });

  res.json({ success: true, data: result.items, pagination: result.pagination });
}

/** GET /api/admin/audit-logs/actions - distinct actions for the filter */
export async function listAuditActions(_req, res) {
  res.json({ success: true, data: await auditLogsRepository.actions() });
}

export default { listAuditLogs, listAuditActions };
