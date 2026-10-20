import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/**
 * Run after express-validator chains. Produces a 422 with a field -> message
 * map so the frontend can highlight individual inputs.
 */
export function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = {};
  for (const error of result.array()) {
    const key = error.path || error.param;
    if (!details[key]) details[key] = error.msg;
  }

  return next(new ApiError(422, 'Validation failed. Please check the highlighted fields.', details));
}

export default validate;
