import { body, param, query } from 'express-validator';
import { idParamRule } from './enquiryValidators.js';

export const loginRules = [
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.').isLength({ min: 6 }).withMessage('Password is too short.'),
];

export const createUserRules = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 150 }),
  body('email').trim().isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('role').optional().isIn(['admin', 'staff']).withMessage('Invalid role.'),
  body('status').optional().isIn(['active', 'disabled']).withMessage('Invalid status.'),
];

export const updateUserRules = [
  ...idParamRule,
  body('name').optional().trim().isLength({ min: 2, max: 150 }),
  body('email').optional().trim().isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('role').optional().isIn(['admin', 'staff']).withMessage('Invalid role.'),
  body('status').optional().isIn(['active', 'disabled']).withMessage('Invalid status.'),
];

export const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive number.'),
  query('perPage').optional().isInt({ min: 1, max: 100 }).withMessage('perPage must be between 1 and 100.'),
  query('status').optional().isIn(['new', 'contacted', 'in_progress', 'completed', 'closed']).withMessage('Invalid status filter.'),
];

export const userParamRule = [param('id').isInt({ min: 1 }).withMessage('Invalid user id.')];

export const forgotPasswordRules = [
  body('email').trim().notEmpty().withMessage('Email is required.').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
];

export const resetPasswordRules = [
  body('token').trim().isLength({ min: 32, max: 200 }).withMessage('This reset link is invalid.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
];

export default {
  loginRules,
  createUserRules,
  updateUserRules,
  paginationRules,
  userParamRule,
  forgotPasswordRules,
  resetPasswordRules,
};
