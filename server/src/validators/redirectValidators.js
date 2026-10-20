import { body } from 'express-validator';
import { idParamRule } from './enquiryValidators.js';

const sourceRule = (optional) =>
  body('sourcePath')
    .optional({ values: optional ? 'null' : 'undefined' })
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Source path is required.')
    .matches(/^\/[^\s]*$/)
    .withMessage('Source path must begin with "/" and contain no spaces.');

const destinationRule = (optional) =>
  body('destinationPath')
    .optional({ values: optional ? 'null' : 'undefined' })
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Destination is required.')
    .matches(/^(https?:\/\/|\/)[^\s]*$/)
    .withMessage('Destination must be a "/path" or an absolute http(s) URL.');

const statusRule = () =>
  body('statusCode').optional({ values: 'null' }).isIn([301, 302, 307, 308]).withMessage('Unsupported status code.').toInt();

const noteRule = () => body('note').optional({ values: 'null' }).trim().isLength({ max: 255 }).withMessage('Note is too long.');

const activeRule = () => body('isActive').optional({ values: 'null' }).isBoolean().withMessage('isActive must be a boolean.').toBoolean();

export const createRedirectRules = [sourceRule(false), destinationRule(false), statusRule(), noteRule(), activeRule()];

export const updateRedirectRules = [
  ...idParamRule,
  sourceRule(true),
  destinationRule(true),
  statusRule(),
  noteRule(),
  activeRule(),
];

export default { createRedirectRules, updateRedirectRules };
