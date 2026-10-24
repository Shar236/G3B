import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { studentRepository } from '../repositories/studentRepository.js';
import { STUDENT_COOKIE, STUDENT_CSRF, setStudentCookies, clearStudentCookies } from '../middleware/studentAuth.js';
import ApiError from '../utils/ApiError.js';
import assessmentRepository from '../repositories/assessmentRepository.js';
import studyAbroadRepository from '../repositories/studyAbroadRepository.js';

const dummyHash = bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
const publicStudent = (student) => ({ id: student.id, name: student.name, email: student.email, phone: student.phone });

async function signIn(req, res, student) {
  if (req.cookies?.[STUDENT_COOKIE]) await studentRepository.revokeSession(req.cookies[STUDENT_COOKIE]);
  const session = await studentRepository.createSession(student.id);
  setStudentCookies(res, session);
  return { student: publicStudent(student), csrfToken: session.csrfToken };
}

export async function register(req, res) {
  const { name, email, phone, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);
  let student;
  try { student = await studentRepository.create({ name, email, phone, passwordHash }); }
  catch (error) {
    if (error.code === '23505') throw ApiError.conflict('An account with this email already exists. Please sign in.');
    throw error;
  }
  res.status(201).json({ success: true, data: await signIn(req, res, student) });
}

export async function login(req, res) {
  const student = await studentRepository.findByEmail(req.body.email);
  const matches = await bcrypt.compare(req.body.password, student?.password_hash || await dummyHash);
  const locked = student?.locked_until && new Date(student.locked_until) > new Date();
  if (!student || !matches || locked) {
    if (student && !locked) await studentRepository.failedLogin(student.id);
    throw ApiError.unauthorized('Unable to sign in. Check your email and password, or try again later if you have made several attempts.');
  }
  await studentRepository.clearLoginFailures(student.id);
  res.json({ success: true, data: await signIn(req, res, student) });
}

export function session(req, res) {
  if (!req.student) {
    clearStudentCookies(res);
    return res.json({ success: true, data: { student: null, csrfToken: null } });
  }
  res.json({ success: true, data: { student: publicStudent(req.student), csrfToken: req.cookies[STUDENT_CSRF] || null } });
}

export async function dashboard(req, res) {
  const [enquiries, assessments, availableAssessments, studyAbroad] = await Promise.all([
    studentRepository.enquiries(req.student.id), assessmentRepository.studentAssignments(req.student.id), assessmentRepository.catalogue({ activeOnly: true }), studyAbroadRepository.studentSaved(req.student.id),
  ]);
  res.json({ success: true, data: { student: publicStudent(req.student), enquiries, assessments, availableAssessments, studyAbroad } });
}

export async function logout(req, res) {
  await studentRepository.revokeSession(req.cookies[STUDENT_COOKIE]);
  clearStudentCookies(res);
  res.json({ success: true, data: { message: 'Signed out of your student account.' } });
}
