import { enquiriesRepository } from '../repositories/userRepository.js';
import { notifyEnquiry } from '../services/notificationService.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/** Best-effort landing page: an explicit value, else the referrer's path. */
function resolveLandingPage(req) {
  if (req.body.landingPage) return String(req.body.landingPage).slice(0, 500);
  const referer = req.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).pathname.slice(0, 500);
  } catch {
    return null;
  }
}

/** Lead source is whatever the form/link declared; defaults to "website". */
function resolveLeadSource(req) {
  const source = req.body.leadSource || req.body.utmSource || req.body.source;
  return source ? String(source).slice(0, 80) : 'website';
}

/**
 * POST /api/enquiries
 * Public enquiry submission: persists the enquiry, then attempts email
 * notification. A notification failure never fails the request because the
 * enquiry is already safely stored and queued for retry.
 */
export async function createEnquiry(req, res) {
  const fullName = req.body.fullName;
  const email = req.body.email;
  const phone = req.body.phone;
  const serviceInterest = req.body.serviceInterest || req.body.interestedService || req.body.service;
  const preferredDestination = req.body.preferredDestination || req.body.preferredCountry || req.body.destination || null;
  const message = req.body.message || null;

  // Guard against accidental double submits (same email + phone within 2 min).
  const duplicate = await enquiriesRepository.findRecentDuplicate({ email, phone, minutes: 2 });
  if (duplicate) {
    throw ApiError.conflict('We already received this enquiry a moment ago. Our team will contact you soon.');
  }

  const enquiry = await enquiriesRepository.create({
    fullName,
    email,
    phone,
    countryCode: req.body.countryCode || null,
    serviceInterest,
    preferredDestination,
    message,
    source: 'website',
    leadSource: resolveLeadSource(req),
    landingPage: resolveLandingPage(req),
    ipAddress: (req.ip || '').slice(0, 45),
    currentStatus: req.body.currentStatus,
    targetDegree: req.body.targetDegree,
  });

  let notifications = { admin: { sent: false }, visitor: { sent: false } };
  try {
    notifications = await notifyEnquiry(enquiry);
  } catch (error) {
    // The enquiry is stored; email problems must not break the visitor flow.
    logger.error('Enquiry notification failed', { enquiryId: enquiry.id, error: error.message });
  }

  res.status(201).json({
    success: true,
    data: {
      enquiry: { id: enquiry.id, createdAt: enquiry.createdAt },
      message: 'Thank you! Your enquiry has been submitted. Our team will contact you shortly.',
      notified: Boolean(notifications?.admin?.sent),
    },
  });
}

export default { createEnquiry };
