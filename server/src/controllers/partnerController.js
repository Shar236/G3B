import { partnerEnquiriesRepository } from '../repositories/partnerRepository.js';
import ApiError from '../utils/ApiError.js';
import toCsv from '../utils/csv.js';
import logger from '../utils/logger.js';

/**
 * POST /api/partner-enquiries
 * Public submission of a partnership / collaboration enquiry.
 */
export async function createPartnerEnquiry(req, res) {
  // Honeypot spam trap: if filled by a bot, silently succeed without writing to the database
  if (req.body.hp_address) {
    logger.warn('Spam bot trapped in partner enquiry honeypot', { ip: req.ip });
    return res.status(201).json({
      success: true,
      message: 'Thank you for your partnership enquiry. The G3B Education team will review your information and get back to you shortly.',
      data: { id: 0 },
    });
  }

  const {
    fullName,
    organizationName,
    email,
    phone,
    countryCode,
    organizationType,
    location,
    websiteUrl,
    partnershipInterest,
    message,
  } = req.body;

  // Anti double-submit guard
  const duplicate = await partnerEnquiriesRepository.findRecentDuplicate({ email, phone, minutes: 2 });
  if (duplicate) {
    throw ApiError.conflict('We already received a partnership enquiry from this organization a moment ago. Our partnerships team will connect with you soon.');
  }

  const enquiry = await partnerEnquiriesRepository.create({
    fullName,
    organizationName,
    email,
    phone,
    countryCode: countryCode || null,
    organizationType,
    location,
    websiteUrl: websiteUrl || null,
    partnershipInterest,
    message,
    ipAddress: (req.ip || '').slice(0, 45),
  });

  logger.info('New partnership enquiry submitted', { id: enquiry.id, organizationName, email });

  return res.status(201).json({
    success: true,
    message: 'Thank you for your partnership enquiry. The G3B Education team will review your information and get back to you shortly.',
    data: {
      id: enquiry.id,
      fullName: enquiry.fullName,
      organizationName: enquiry.organizationName,
      status: enquiry.status,
    },
  });
}

/**
 * GET /api/admin/partner-enquiries
 * Authenticated list of partnership enquiries with pagination and search.
 */
export async function listPartnerEnquiries(req, res) {
  const result = await partnerEnquiriesRepository.list(req.query);
  res.json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
}

/**
 * GET /api/admin/partner-enquiries/stats
 * Status counts for the dashboard.
 */
export async function partnerStats(_req, res) {
  const stats = await partnerEnquiriesRepository.stats();
  res.json({ success: true, data: stats });
}

/**
 * GET /api/admin/partner-enquiries/export
 * Download CSV export of partnership enquiries.
 */
export async function exportPartnerEnquiries(req, res) {
  const rows = await partnerEnquiriesRepository.listForExport(req.query);
  const csv = toCsv(rows, [
    'id',
    'fullName',
    'organizationName',
    'email',
    'phone',
    'countryCode',
    'organizationType',
    'location',
    'websiteUrl',
    'partnershipInterest',
    'status',
    'message',
    'createdAt',
  ]);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="g3b-partner-enquiries-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
}

/**
 * GET /api/admin/partner-enquiries/:id
 * Retrieve a single partnership enquiry.
 */
export async function getPartnerEnquiry(req, res) {
  const enquiry = await partnerEnquiriesRepository.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Partnership enquiry not found.');
  res.json({ success: true, data: enquiry });
}

/**
 * PATCH /api/admin/partner-enquiries/:id
 * Update status or notes for a partnership enquiry.
 */
export async function updatePartnerEnquiry(req, res) {
  const enquiry = await partnerEnquiriesRepository.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Partnership enquiry not found.');

  const updated = await partnerEnquiriesRepository.update(req.params.id, req.body);
  logger.info('Updated partnership enquiry', { id: req.params.id, status: req.body.status });
  res.json({ success: true, data: updated });
}

/**
 * DELETE /api/admin/partner-enquiries/:id
 * Delete a partnership enquiry (admin only).
 */
export async function deletePartnerEnquiry(req, res) {
  const enquiry = await partnerEnquiriesRepository.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Partnership enquiry not found.');

  const deleted = await partnerEnquiriesRepository.remove(req.params.id);
  res.json({ success: true, deleted });
}

export default {
  createPartnerEnquiry,
  listPartnerEnquiries,
  partnerStats,
  exportPartnerEnquiries,
  getPartnerEnquiry,
  updatePartnerEnquiry,
  deletePartnerEnquiry,
};
