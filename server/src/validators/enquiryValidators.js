import { body, param } from 'express-validator';

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
];

const ENQUIRY_STATUSES = ['new', 'contacted', 'in_progress', 'qualified', 'converted', 'completed', 'closed'];

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
