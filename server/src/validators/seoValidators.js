import { body, param } from 'express-validator';
import { idParamRule } from './enquiryValidators.js';

/** Apply `.optional()` when building the "update" variant of a rule chain. */
const maybe = (chain, partial) => (partial ? chain.optional({ values: 'null' }) : chain);

const PAGE_TYPES = [
  'home',
  'services',
  'service',
  'destinations',
  'destination',
  'about',
  'contact',
  'blog',
  'article',
  'custom',
];

const PAGE_STATUSES = ['draft', 'published'];
const HEADING_LEVELS = ['none', 'h1', 'h2', 'h3', 'h4'];

const optionalText = (name, max = 2000) =>
  body(name).optional({ values: 'null' }).trim().isLength({ max }).withMessage(`${name} is too long.`);

const urlField = (name, max = 500) =>
  body(name).optional({ values: 'null' }).trim().isLength({ max }).withMessage(`${name} is too long.`);

/** A route must be a rooted path such as `/services` or `/services/ielts`. */
const routeRule = (partial) =>
  maybe(
    body('route')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Route is required.')
      .matches(/^\/[A-Za-z0-9\-._~/]*$/)
      .withMessage('Route must start with "/" and contain only letters, numbers, "-", "_", "." or "/".')
      .custom((value) => value === '/' || !value.endsWith('/'))
      .withMessage('Route must not end with a trailing slash (use "/" for the homepage).'),
    partial,
  );

/**
 * Page rules. Only `name` and `route` are required when creating; everything
 * else falls back to the database default, and every field is optional on
 * update so the admin UI can send partial payloads.
 */
const pageSpec = (partial) => [
  ...(partial ? idParamRule : []),
  maybe(
    body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Page name is required.'),
    partial,
  ),
  routeRule(partial),
  optionalText('slug', 190),
  body('pageType').optional({ values: 'null' }).isIn(PAGE_TYPES).withMessage('Invalid page type.'),
  body('template')
    .optional({ values: 'null' })
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Template is invalid.'),
  body('status').optional({ values: 'null' }).isIn(PAGE_STATUSES).withMessage('Status must be draft or published.'),
  body('isIndexable')
    .optional({ values: 'null' })
    .isBoolean()
    .withMessage('isIndexable must be a boolean.')
    .toBoolean(),
  body('sortOrder')
    .optional({ values: 'null' })
    .isInt({ min: 0 })
    .withMessage('sortOrder must be a non-negative integer.')
    .toInt(),
];

/**
 * SEO metadata rules. The length limits are the hard database limits; the
 * recommended lengths (60/160 characters) are surfaced as warnings in the UI,
 * never enforced here, because they are guidance rather than a rule.
 */
const seoSpec = (partial) => [
  ...(partial ? idParamRule : []),
  optionalText('seoTitle', 255),
  optionalText('metaDescription', 500),
  urlField('canonicalUrl'),
  optionalText('metaRobots', 120),
  optionalText('ogTitle', 255),
  optionalText('ogDescription', 500),
  urlField('ogImage'),
  optionalText('primaryKeyword', 150),
  optionalText('secondaryKeywords', 500),
  body('structuredData')
    .optional({ values: 'null' })
    .custom((value) => typeof value === 'object' && !Array.isArray(value))
    .withMessage('structuredData must be a JSON object.'),
  body('publish').optional().isBoolean().withMessage('publish must be a boolean.').toBoolean(),
];

export const pageRules = {
  create: pageSpec(false),
  update: pageSpec(true),
};

export const seoRules = seoSpec(true);

export const sectionRules = [
  param('sectionKey')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Section key is required.')
    .matches(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i)
    .withMessage('Section key may only contain letters, numbers, "-" and "_".'),
  optionalText('label', 150),
  body('headingLevel').optional({ values: 'null' }).isIn(HEADING_LEVELS).withMessage('Invalid heading level.'),
  optionalText('headingText', 2000),
  optionalText('description', 5000),
  optionalText('ctaLabel', 150),
  urlField('ctaUrl'),
  urlField('imageUrl'),
  optionalText('imageAlt', 255),
  optionalText('imageCaption', 255),
  body('sortOrder').optional({ values: 'null' }).isInt({ min: 0 }).withMessage('sortOrder must be a non-negative integer.').toInt(),
  body('isActive').optional({ values: 'null' }).isBoolean().withMessage('isActive must be a boolean.').toBoolean(),
];

export const sectionReorderRules = [
  body('keys')
    .isArray({ min: 1, max: 100 })
    .withMessage('`keys` must be a non-empty array of section keys.')
    .custom((keys) => keys.every((key) => typeof key === 'string' && key.trim().length > 0 && key.length <= 100))
    .withMessage('`keys` must contain non-empty strings of at most 100 characters.'),
];

export const seoIssueRules = [
  ...idParamRule,
  body('status')
    .isIn(['open', 'fixed', 'ignored', 'awaiting_verification'])
    .withMessage('Invalid finding status.'),
];

export default { pageRules, seoRules, sectionRules, sectionReorderRules, seoIssueRules };
