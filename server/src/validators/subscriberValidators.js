import { body, query } from 'express-validator';
import { idParamRule } from './enquiryValidators.js';

const emailRule = () => body('email').isString().trim().isLength({ max: 190 }).isEmail().withMessage('Enter a valid email address.').normalizeEmail({ gmail_remove_dots: false });
const phoneRule = () => body('phone').optional({ values: 'falsy' }).isString().trim().matches(/^[+]?\d[\d\s()-]{6,38}$/).withMessage('Enter a valid phone number.');

export const subscribeRules = [
  emailRule(), phoneRule(),
  body('source').optional().isIn(['newsletter', 'guide']).withMessage('Invalid subscription source.'),
  body('consent').equals('true').withMessage('Please agree to receive education updates.'),
];
export const createSubscriberRules = [...subscribeRules, body('status').optional().isIn(['active', 'unsubscribed'])];
export const updateSubscriberRules = [
  ...idParamRule, emailRule().optional(), phoneRule(),
  body('source').optional().isIn(['newsletter', 'guide']),
  body('status').optional().isIn(['active', 'unsubscribed']),
];
export const subscriberListRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('perPage').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString().trim().isLength({ max: 200 }),
  query('status').optional().isIn(['active', 'unsubscribed']),
  query('source').optional().isIn(['newsletter', 'guide']),
  query('sortBy').optional().isIn(['email', 'createdAt', 'status']),
  query('sortDir').optional().isIn(['asc', 'desc']),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601().custom((value, { req }) => !req.query.dateFrom || new Date(value) >= new Date(req.query.dateFrom)).withMessage('End date must be on or after the start date.'),
];
export const subscriberBulkRules = [
  body('ids').isArray({ min: 1, max: 100 }).withMessage('Select between 1 and 100 subscribers.'),
  body('ids.*').isInt({ min: 1 }).toInt(),
  body('action').isIn(['delete', 'activate', 'unsubscribe']),
];
export const unsubscribeRules = [body('token').isString().matches(/^[a-f0-9]{64}$/).withMessage('This unsubscribe link is invalid.')];
