import { body } from 'express-validator';
import { idParamRule } from './enquiryValidators.js';
import { parseYouTubeUrl } from '../services/youtubeApi.js';

export const registerYouTubeRules = [
  body('url').isString().bail().trim().isLength({ max: 500 }).bail().custom((value) => Boolean(parseYouTubeUrl(value))).withMessage('Enter a valid YouTube video URL.'),
  body('title').optional({ values: 'falsy' }).isString().bail().trim().isLength({ min: 1, max: 200 }),
  body('category').optional({ values: 'falsy' }).isString().bail().trim().isLength({ max: 100 }),
  body('sortOrder').optional({ values: 'falsy' }).isInt().toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
];

export const updateYouTubeRules = [
  ...idParamRule,
  body('verifiedShort').optional().isBoolean().toBoolean(),
  body('excluded').optional().isBoolean().toBoolean(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('title').optional().isString().bail().trim().isLength({ min: 1, max: 200 }),
  body('category').optional().isString().bail().trim().isLength({ max: 100 }),
  body('sortOrder').optional().isInt().toInt(),
  body().custom((value) => value && Object.keys(value).every((key) => ['verifiedShort', 'excluded', 'isActive', 'title', 'category', 'sortOrder'].includes(key))).withMessage('Unsupported YouTube registry fields.'),
];
