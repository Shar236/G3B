import { body } from 'express-validator';
import { idParamRule } from './enquiryValidators.js';
import { isSafeAssetUrl, parseVideoUrl } from '../utils/contentUrls.js';

/** Apply `.optional()` to a rule chain when building "update" validators. */
const maybe = (chain, partial) => (partial ? chain.optional({ values: 'null' }) : chain);

/** A required (or optional when partial) trimmed string with a max length. */
const str = (name, { max = 255, partial = false, message } = {}) =>
  maybe(body(name).trim().isLength({ min: 1, max }).withMessage(message || `${name} is invalid.`), partial);

const intField = (name, { partial = false } = {}) =>
  maybe(body(name).isInt({ min: 0 }).withMessage(`${name} must be a non-negative integer.`).toInt(), partial);

const boolField = (name, { partial = false } = {}) =>
  maybe(body(name).isBoolean().withMessage(`${name} must be a boolean.`).toBoolean(), partial);

const urlField = (name, { partial = false, max = 500 } = {}) =>
  maybe(body(name).trim().isLength({ min: 1, max }).withMessage(`${name} is invalid.`).custom(isSafeAssetUrl).withMessage(`${name} must be an HTTP(S) URL or a local path.`), partial);

const optionalText = (name, max = 2000) =>
  body(name).optional({ values: 'null' }).trim().isLength({ max }).withMessage(`${name} is too long.`);

const stringList = (name, partial = false) =>
  maybe(
    body(name)
      .isArray({ max: 20 })
      .withMessage(`${name} must be an array of up to 20 items.`)
      .custom((list) => list.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 255))
      .withMessage(`${name} items must be non-empty strings of at most 255 characters.`),
    partial,
  );

const spec = {
  services: (partial) => [
    ...(partial ? idParamRule : []),
    str('title', { max: 200, partial, message: 'Title is required.' }),
    optionalText('slug', 120),
    optionalText('subtitle', 255),
    optionalText('badge', 100),
    optionalText('icon', 100),
    optionalText('description', 3000),
    optionalText('ctaLabel', 150),
    urlField('imageUrl', { partial }).optional({ values: 'null' }),
    intField('sortOrder', { partial }),
    boolField('isActive', { partial }),
    stringList('features', partial),
    body('packages').optional({ values: 'null' }),
    body('pricing').optional({ values: 'null' }),
    body('trainers').optional({ values: 'null' }),
    body('faqs').optional({ values: 'null' }),
  ],
  destinations: (partial) => [
    ...(partial ? idParamRule : []),
    str('country', { max: 120, partial, message: 'Country is required.' }),
    optionalText('flagIcon', 100),
    optionalText('description', 2000),
    optionalText('stayBackTime', 150),
    optionalText('workRights', 150),
    optionalText('detailLink', 500),
    optionalText('currencySymbol', 20),
    optionalText('avgTuition', 150),
    urlField('imageUrl', { partial }).optional({ values: 'null' }),
    intField('sortOrder', { partial }),
    boolField('isActive', { partial }),
    stringList('points', partial),
  ],
  gallery: (partial) => [
    ...(partial ? idParamRule : []),
    str('altText', { max: 200, partial, message: 'Alt text is required.' }),
    optionalText('caption', 255),
    optionalText('category', 100),
    urlField('imageUrl', { partial }),
    intField('sortOrder', { partial }),
    boolField('isActive', { partial }),
  ],
  testimonials: (partial) => [
    ...(partial ? idParamRule : []),
    str('authorName', { max: 150, partial, message: 'Author name is required.' }),
    optionalText('authorRole', 150),
    optionalText('avatarText', 6),
    str('content', { max: 2000, partial, message: 'Review content is required.' }),
    maybe(body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.').toInt(), partial),
    maybe(body('source').isIn(['google', 'website']).withMessage('Invalid source.'), partial),
    urlField('sourceUrl', { partial, max: 500 }).optional({ values: 'null' }),
    optionalText('postedLabel', 80),
    intField('sortOrder', { partial }),
    boolField('isActive', { partial }),
  ],
  videos: (partial) => [
    ...(partial ? idParamRule : []),
    str('title', { max: 200, partial, message: 'Title is required.' }),
    optionalText('category', 100),
    optionalText('studentName', 150),
    optionalText('destinationCountry', 100),
    str('youtubeId', { max: 40, partial, message: 'YouTube video id is required.' }),
    urlField('youtubeUrl', { partial }).custom((value, { req }) => {
      const video = parseVideoUrl(value);
      return video && (!req.body.youtubeId || video.id === req.body.youtubeId);
    }).withMessage('Enter a valid YouTube or Vimeo URL with its matching video ID.'),
    maybe(body('orientation').isIn(['landscape', 'portrait']).withMessage('Invalid orientation.'), partial),
    intField('sortOrder', { partial }),
    boolField('isActive', { partial }),
  ],
  processSteps: (partial) => [
    ...(partial ? idParamRule : []),
    maybe(body('stepNumber').isInt({ min: 1, max: 99 }).withMessage('Step number must be between 1 and 99.').toInt(), partial),
    str('title', { max: 150, partial, message: 'Title is required.' }),
    optionalText('description', 400),
    optionalText('badge', 80),
    optionalText('icon', 80),
    intField('sortOrder', { partial }),
    boolField('isActive', { partial }),
  ],
  stats: (partial) => [
    ...(partial ? idParamRule : []),
    str('value', { max: 40, partial, message: 'Statistic value is required.' }),
    str('label', { max: 120, partial, message: 'Statistic label is required.' }),
    intField('sortOrder', { partial }),
    boolField('isActive', { partial }),
  ],
  whyFeatures: (partial) => [
    ...(partial ? idParamRule : []),
    optionalText('icon', 80),
    str('text', { max: 255, partial, message: 'Feature text is required.' }),
    intField('sortOrder', { partial }),
    boolField('isActive', { partial }),
  ],
  certifications: (partial) => [
    ...(partial ? idParamRule : []),
    str('altText', { max: 200, partial, message: 'Alt text is required.' }),
    urlField('imageUrl', { partial }),
    urlField('fullUrl', { partial }).optional({ values: 'null' }),
    intField('sortOrder', { partial }),
    boolField('isActive', { partial }),
  ],
  enquiryOptions: (partial) => [
    ...(partial ? idParamRule : []),
    str('label', { max: 150, partial, message: 'Label is required.' }),
    intField('sortOrder', { partial }),
    boolField('isActive', { partial }),
  ],
  socialLinks: (partial) => [
    ...(partial ? idParamRule : []),
    str('platform', { max: 80, partial, message: 'Platform is required.' }),
    urlField('url', { partial }),
    optionalText('icon', 80),
    intField('sortOrder', { partial }),
    boolField('isActive', { partial }),
  ],
  navigation: (partial) => [
    ...(partial ? idParamRule : []),
    str('label', { max: 100, partial, message: 'Navigation label is required.' }),
    str('url', { max: 255, partial, message: 'URL/path is required.' }),
    intField('sortOrder', { partial }),
    boolField('isActive', { partial }),
    boolField('openNewTab', { partial }),
    boolField('isButton', { partial }),
  ],
  faqs: (partial) => [
    ...(partial ? idParamRule : []),
    str('question', { max: 500, partial, message: 'Question is required.' }),
    str('answer', { max: 5000, partial, message: 'Answer is required.' }),
    optionalText('category', 100),
    maybe(body('pageId').isInt({ min: 1 }).withMessage('Invalid page.').toInt(), partial).optional({ values: 'null' }),
    intField('sortOrder', { partial }),
    boolField('isActive', { partial }),
  ],
};

/** Rule sets keyed by resource name, e.g. contentRules.services.create */
export const contentRules = Object.fromEntries(
  Object.entries(spec).map(([name, build]) => [name, { create: build(false), update: build(true) }]),
);

export const contentBlockRules = [
  body('heading').optional({ values: 'null' }).trim().isLength({ max: 500 }).withMessage('Heading is too long.'),
  body('subheading').optional({ values: 'null' }).trim().isLength({ max: 1000 }).withMessage('Subheading is too long.'),
  body('body').optional({ values: 'null' }).trim().isLength({ max: 5000 }).withMessage('Body is too long.'),
  body('ctaLabel').optional({ values: 'null' }).trim().isLength({ max: 150 }).withMessage('CTA label is too long.'),
  body('ctaUrl').optional({ values: 'null' }).trim().isLength({ max: 500 }).withMessage('CTA URL is too long.'),
];

export const reorderRules = [
  body('ids').isArray({ min: 1, max: 200 }).withMessage('`ids` must be a non-empty array.').custom((ids) =>
    ids.every((id) => Number.isInteger(id) && id > 0),
  ).withMessage('`ids` must contain positive integers.'),
];

export const settingsRules = [
  body().custom((value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Settings payload must be an object of key/value pairs.');
    }
    const keys = Object.keys(value);
    if (keys.length === 0) throw new Error('No settings provided.');
    if (keys.length > 100) throw new Error('Too many settings in one request.');
    for (const key of keys) {
      if (key.length > 100) throw new Error(`Setting key "${key}" is too long.`);
      const settingValue = value[key];
      if (settingValue !== null && typeof settingValue !== 'string' && typeof settingValue !== 'number') {
        throw new Error(`Setting "${key}" must be a string, number or null.`);
      }
      if (typeof settingValue === 'string' && settingValue.length > 5000) {
        throw new Error(`Setting "${key}" is too long.`);
      }
    }
    return true;
  }),
];

export default { contentRules, contentBlockRules, reorderRules, settingsRules };
