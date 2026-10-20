import { body } from 'express-validator';
import { idParamRule } from './enquiryValidators.js';

const optionalText = (name, max) =>
  body(name).optional({ values: 'null' }).trim().isLength({ max }).withMessage(`${name} is too long.`);

/** PATCH /api/admin/media/:id - descriptive metadata for accessibility + SEO. */
export const mediaUpdateRules = [
  ...idParamRule,
  optionalText('altText', 255),
  optionalText('title', 255),
  optionalText('caption', 500),
  optionalText('description', 5000),
  body('folder').optional({ values: 'null' }).trim().isLength({ min: 1, max: 150 }).withMessage('Invalid folder.'),
  body('pageId').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Invalid page.').toInt(),
];

/** POST /api/admin/media/:id/rename - descriptive filenames are an SEO signal. */
export const mediaRenameRules = [
  ...idParamRule,
  body('name')
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Provide a file name of 1-120 characters.'),
];

export default { mediaUpdateRules, mediaRenameRules };
