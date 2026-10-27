import { Router } from 'express';
import { body } from 'express-validator';
import * as student from '../controllers/studentController.js';
import { resolveStudent, requireStudent, studentCsrf } from '../middleware/studentAuth.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as assessments from '../controllers/assessmentController.js';
import { param } from 'express-validator';
import * as studyAbroad from '../controllers/studyAbroadController.js';
import * as learning from '../controllers/learningController.js';
import { uploadLearningPdf } from '../middleware/upload.js';

const router = Router();
const emailRule = () => body('email').trim().isEmail().withMessage('Enter a valid email address.').isLength({ max: 190 }).normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false, outlookdotcom_remove_subaddress: false, yahoo_remove_subaddress: false, icloud_remove_subaddress: false });
router.use(resolveStudent);
router.get('/session', student.session);
router.post('/register', loginRateLimiter, [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Enter your name (2–150 characters).'),
  emailRule(),
  body('phone').trim().matches(/^[+]?[\d][\d\s()-]{6,24}$/).withMessage('Enter a valid phone number.'),
  body('password').isString().isLength({ min: 10, max: 72 }).withMessage('Use a password of 10–72 characters.').custom((value) => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Password must be at most 72 bytes.'),
], validate, asyncHandler(student.register));
router.post('/login', loginRateLimiter, [emailRule(), body('password').isString().isLength({ min: 1, max: 200 }).withMessage('Enter your password.')], validate, asyncHandler(student.login));
router.get('/dashboard', requireStudent, asyncHandler(student.dashboard));
router.get('/learning', requireStudent, asyncHandler(learning.studentAssignments));
router.get('/learning/:id', requireStudent, [param('id').isInt({ min: 1 }).toInt()], validate, asyncHandler(learning.studentAssignment));
router.get('/learning/files/:fileId', requireStudent, [param('fileId').isInt({ min: 1 }).toInt()], validate, asyncHandler(learning.downloadStudentFile));
router.post('/learning/:id/submission', requireStudent, studentCsrf, [param('id').isInt({ min: 1 }).toInt()], validate, uploadLearningPdf, asyncHandler(learning.submitAssignment));
router.patch('/profile', requireStudent, studentCsrf, [
  body('name').trim().isLength({ min: 2, max: 150 }),
  body('phone').trim().matches(/^[+]?[\d][\d\s()-]{6,24}$/),
], validate, asyncHandler(learning.updateProfile));
router.post('/change-password', requireStudent, studentCsrf, [
  body('currentPassword').isString().notEmpty(),
  body('newPassword').isString().isLength({ min: 10, max: 72 }),
], validate, asyncHandler(learning.changePassword));
router.post('/assessments/:id/request', requireStudent, studentCsrf, [param('id').isInt({ min: 1 }).toInt()], validate, asyncHandler(assessments.requestAssessment));
router.get('/assessments/:id/report', requireStudent, [param('id').isInt({ min: 1 }).toInt()], validate, asyncHandler(assessments.downloadStudentReport));
router.put('/shortlist/universities/:id', requireStudent, studentCsrf, [param('id').isInt({min:1}).toInt(),body('save').isBoolean().toBoolean()], validate, asyncHandler(studyAbroad.saveUniversity));
router.put('/shortlist/programs/:id', requireStudent, studentCsrf, [param('id').isInt({min:1}).toInt(),body('save').isBoolean().toBoolean()], validate, asyncHandler(studyAbroad.saveProgram));
router.put('/compare/programs/:id', requireStudent, studentCsrf, [param('id').isInt({min:1}).toInt(),body('save').isBoolean().toBoolean()], validate, asyncHandler(studyAbroad.compareProgram));
router.put('/study-preferences', requireStudent, studentCsrf, [body('preferredDestinations').optional({values:'falsy'}).trim().isLength({max:2000}),body('degreeLevel').optional({values:'falsy'}).trim().isLength({max:100}),body('subjectInterests').optional({values:'falsy'}).trim().isLength({max:2000}),body('budgetAmount').optional({values:'falsy'}).isFloat({min:0,max:100000000}).toFloat(),body('budgetCurrency').optional({values:'falsy'}).trim().isLength({min:3,max:3})], validate, asyncHandler(studyAbroad.savePreferences));
router.put('/recent-study/:type/:id', requireStudent, studentCsrf, [param('type').isIn(['university','program']),param('id').isInt({min:1}).toInt()], validate, asyncHandler(studyAbroad.recordRecent));
router.put('/application-checklist/:key', requireStudent, studentCsrf, [param('key').matches(/^[a-z0-9-]{2,80}$/),body('completed').isBoolean().toBoolean()], validate, asyncHandler(studyAbroad.updateChecklist));
router.post('/logout', requireStudent, studentCsrf, asyncHandler(student.logout));
export default router;
