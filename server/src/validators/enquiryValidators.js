import { body, param, query } from 'express-validator';

const PHONE_REGEX = /^[+]?[\d][\d\s()-]{6,19}$/;

export const createEnquiryRules = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.')
    .isLength({ min: 2, max: 150 })
    .withMessage('Full name must be between 2 and 150 characters.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .isLength({ max: 190 })
    .withMessage('Email is too long.')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required.')
    .matches(PHONE_REGEX)
    .withMessage('Please enter a valid phone number.'),
  body('serviceInterest')
    .customSanitizer((val, { req }) => val || req.body.interestedService || req.body.service || '')
    .trim()
    .notEmpty()
    .withMessage('Please select the service you are interested in.')
    .isLength({ max: 150 })
    .withMessage('Service of interest is too long.'),
  body('preferredDestination')
    .customSanitizer((val, { req }) => val || req.body.preferredCountry || req.body.destination || '')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('Preferred destination is too long.'),
  body('message')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message must be 2000 characters or fewer.'),
  // Attribution captured from the submitting page (never trusted for anything
  // more than reporting).
  body('countryCode').optional({ values: 'falsy' }).trim().isLength({ max: 10 }).withMessage('Invalid country code.'),
  body('leadSource').optional({ values: 'falsy' }).trim().isLength({ max: 80 }).withMessage('Invalid lead source.'),
  body('landingPage').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Invalid landing page.'),
  body('currentStatus').optional({ values: 'falsy' }).isIn(['high_school', 'college', 'working']).withMessage('Invalid current education or career status.'),
  body('targetDegree').optional({ values: 'falsy' }).isIn(['ug', 'pg', 'mba', 'undecided']).withMessage('Invalid target degree.'),
  body('preferredDate').optional({ values: 'falsy' }).matches(/^\d{4}-\d{2}-\d{2}$/).bail().isISO8601({ strict: true }).bail().custom((value) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return value >= today;
  }).withMessage('Choose today or a future date.'),
  body('preferredTime').optional({ values: 'falsy' }).isIn(['Morning (9am–12pm IST)', 'Afternoon (12pm–4pm IST)', 'Evening (4pm–7pm IST)']).withMessage('Choose a valid preferred time.'),
];

export const ENQUIRY_STATUSES = ['new', 'contacted', 'in_progress', 'qualified', 'converted', 'completed', 'closed', 'archived'];

export const enquiryListRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('perPage').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString().trim().isLength({ max: 200 }),
  query('status').optional().isIn(ENQUIRY_STATUSES),
  query('assignedTo').optional().isInt({ min: 1 }),
  ...['service', 'destination', 'leadSource'].map((key) => query(key).optional().isString().trim().isLength({ max: 150 })),
  query('currentStatus').optional().isIn(['high_school', 'college', 'working']),
  query('targetDegree').optional().isIn(['ug', 'pg', 'mba', 'undecided']),
  query('segment').optional().isIn(['school', 'workshop', 'professional']),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'fullName', 'email', 'status']),
  query('sortDir').optional().isIn(['asc', 'desc']),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601().custom((value, { req }) => !req.query.dateFrom || new Date(value) >= new Date(req.query.dateFrom)).withMessage('End date must be on or after the start date.'),
  query('includeAnonymized').optional().isIn(['true', 'false']),
];

export const enquiryBulkRules = [
  body('ids').isArray({ min: 1, max: 100 }).withMessage('Select between 1 and 100 enquiries.'),
  body('ids.*').isInt({ min: 1 }).toInt(),
  body('action').isIn(['status', 'delete']),
  body('status').if(body('action').equals('status')).isIn(ENQUIRY_STATUSES).withMessage('Select a valid status.'),
];

export const updateEnquiryRules = [
  param('id').isInt({ min: 1 }).withMessage('Invalid enquiry id.'),
  body('fullName').optional().trim().isLength({ min: 2, max: 150 }).withMessage('Invalid name.'),
  body('email').optional().trim().isEmail().withMessage('Invalid email.').normalizeEmail(),
  body('phone').optional().trim().matches(PHONE_REGEX).withMessage('Invalid phone number.'),
  body('countryCode').optional({ values: 'null' }).trim().isLength({ max: 10 }),
  body('serviceInterest').optional().trim().isLength({ min: 2, max: 150 }).withMessage('Invalid service.'),
  body('preferredDestination').optional({ values: 'null' }).trim().isLength({ max: 120 }),
  body('message').optional({ values: 'null' }).trim().isLength({ max: 2000 }),
  body('status').optional().isIn(ENQUIRY_STATUSES).withMessage('Invalid status.'),
  body('assignedTo').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Invalid assignee.'),
  body('leadSource').optional({ values: 'null' }).trim().isLength({ max: 80 }),
  body('landingPage').optional({ values: 'null' }).trim().isLength({ max: 500 }),
  body('currentStatus').optional({ values: 'null' }).isIn(['high_school', 'college', 'working']),
  body('targetDegree').optional({ values: 'null' }).isIn(['ug', 'pg', 'mba', 'undecided']),
  body('followUpAt')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Follow-up date must be a valid ISO date.')
    .toDate(),
];

export const noteRules = [
  body('note')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('A note of 1-5000 characters is required.'),
];

export const noteParamRules = [
  param('id').isInt({ min: 1 }).withMessage('Invalid enquiry id.'),
  param('noteId').isInt({ min: 1 }).withMessage('Invalid note id.'),
];

export const idParamRule = [param('id').isInt({ min: 1 }).withMessage('Invalid id.')];

export default { createEnquiryRules, updateEnquiryRules, noteRules, noteParamRules, idParamRule };
