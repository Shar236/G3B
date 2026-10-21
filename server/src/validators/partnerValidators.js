import { body, param, query } from 'express-validator';

const PHONE_REGEX = /^[+]?[\d][\d\s()-]{6,19}$/;

export const PARTNER_ENQUIRY_STATUSES = [
  'new',
  'contacted',
  'in_discussion',
  'approved',
  'declined',
  'archived',
];

export const createPartnerEnquiryRules = [
  (req, res, next) => {
    if (req.body) {
      if (req.body.hp_address || req.body.website_url_hp) {
        return res.status(201).json({
          success: true,
          referenceId: 'HONEYPOT-DISCARD',
          message: 'Thank you for your partnership enquiry. The G3B Education team will review your information and get back to you shortly.',
          data: { id: 0 },
        });
      }
      if (!req.body.email && req.body.workEmail) req.body.email = req.body.workEmail;
      if (!req.body.phone && req.body.phoneNumber) req.body.phone = req.body.phoneNumber;
    }
    next();
  },
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required.')
    .isLength({ min: 2, max: 150 })
    .withMessage('Full name must be between 2 and 150 characters.'),
  body('organizationName')
    .trim()
    .notEmpty()
    .withMessage('Organization name is required.')
    .isLength({ min: 2, max: 200 })
    .withMessage('Organization name must be between 2 and 200 characters.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Work email is required.')
    .isEmail()
    .withMessage('Please enter a valid work email address.')
    .isLength({ max: 190 })
    .withMessage('Email address is too long.')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required.')
    .matches(PHONE_REGEX)
    .withMessage('Please enter a valid contact phone number.'),
  body('countryCode')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 10 })
    .withMessage('Invalid country code.'),
  body('organizationType')
    .trim()
    .notEmpty()
    .withMessage('Please select your organization type.')
    .isLength({ max: 100 })
    .withMessage('Organization type is too long.'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('City or country is required.')
    .isLength({ max: 150 })
    .withMessage('Location is too long.'),
  body('websiteUrl')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Website URL is too long.'),
  body('partnershipInterest')
    .trim()
    .notEmpty()
    .withMessage('Please select your partnership interest.')
    .isLength({ max: 200 })
    .withMessage('Partnership interest selection is too long.'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Please provide a brief message about your collaboration interests.')
    .isLength({ min: 5, max: 3000 })
    .withMessage('Message must be between 5 and 3000 characters.'),
  body('consent')
    .custom((val) => val === true || val === 'true' || val === 1 || val === '1')
    .withMessage('You must agree to the privacy policy to submit a partnership enquiry.'),
  body('hp_address')
    .optional()
    .trim(),
];

export const updatePartnerEnquiryRules = [
  param('id').isInt({ min: 1 }).withMessage('A valid enquiry ID is required.').toInt(),
  body('status')
    .optional()
    .isIn(PARTNER_ENQUIRY_STATUSES)
    .withMessage(`Status must be one of: ${PARTNER_ENQUIRY_STATUSES.join(', ')}`),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 5000 }),
];

export const partnerListRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('perPage').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString().trim().isLength({ max: 200 }),
  query('status').optional().isIn([...PARTNER_ENQUIRY_STATUSES, 'all']),
  query('organizationType').optional().isString().trim().isLength({ max: 100 }),
  query('sortBy').optional().isIn(['createdAt', 'fullName', 'organizationName', 'status', 'email']),
  query('sortDir').optional().isIn(['asc', 'desc']),
];
