import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

// Exercise persistence without sending test messages to staff or visitors.
vi.mock('../src/services/notificationService.js', () => ({ notifyEnquiry: vi.fn(async () => ({ admin: { sent: false }, visitor: { sent: false } })) }));

import { createApp } from '../src/app.js';
import { closePool, pingDatabase, query, queryOne } from '../src/config/db.js';
import { signToken } from '../src/middleware/auth.js';

const app = createApp();
const first = request.agent(app);
const second = request.agent(app);
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const password = 'StudentExample!8274';
let studentOne;
let studentTwo;
let csrfOne;
let csrfTwo;
let sessionCookies;
let enquiryId;
let dbAvailable = false;

beforeAll(async () => {
  try { await pingDatabase(); dbAvailable = true; } catch { dbAvailable = false; }
});
afterAll(async () => {
  if (dbAvailable) {
    const ids = [studentOne?.id, studentTwo?.id].filter(Boolean);
    for (const id of ids) {
      await query('DELETE FROM enquiries WHERE student_id = ?', [id]);
      await query('DELETE FROM students WHERE id = ?', [id]);
    }
  }
  await closePool().catch(() => {});
});

describe('student access and server validation', () => {
  it('requires a server-validated student session for private data', async () => {
    expect((await request(app).get('/api/student/dashboard')).status).toBe(401);
    expect((await request(app).get('/api/student/dashboard').set('Cookie', 'g3b_student_session=not-a-token')).status).toBe(401);
  });
  it('validates registration fields on the server', async () => {
    const res = await request(app).post('/api/student/register').send({ name: 'A', email: 'bad', phone: 'invalid', password: 'short' });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.details)).toEqual(expect.arrayContaining(['name', 'email', 'phone', 'password']));
  });
  it('rejects past or invalid preferred contact details on public enquiries', async () => {
    const res = await request(app).post('/api/enquiries').send({ fullName: 'Validation Student', email: 'valid@example.com', phone: '+919876543210', serviceInterest: 'Career Counselling', preferredDate: '2020-02-30', preferredTime: 'midnight' });
    expect(res.status).toBe(422);
    expect(res.body.details).toHaveProperty('preferredDate');
    expect(res.body.details).toHaveProperty('preferredTime');
  });
});

describe('student registration, enquiry ownership and session isolation', () => {
  it('creates isolated student identities with hashed passwords and secure session cookies', async (context) => {
    if (!dbAvailable) return context.skip();
    const register = async (agent, number) => agent.post('/api/student/register').send({ name: `Portal Test ${number}`, email: `portal-${suffix}-${number}@example.com`, phone: '+919876543210', password, role: 'admin' });
    const a = await register(first, 1);
    const b = await register(second, 2);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    studentOne = a.body.data.student;
    studentTwo = b.body.data.student;
    csrfOne = a.body.data.csrfToken;
    csrfTwo = b.body.data.csrfToken;
    sessionCookies = a.headers['set-cookie'].map((cookie) => cookie.split(';')[0]);
    expect(studentOne).not.toHaveProperty('password_hash');
    expect(studentOne).not.toHaveProperty('role');
    expect(a.headers['set-cookie'].some((cookie) => cookie.startsWith('g3b_student_session=') && cookie.includes('HttpOnly'))).toBe(true);
    expect(a.headers['set-cookie'].some((cookie) => cookie.startsWith('g3b_token='))).toBe(false);
    const stored = await queryOne('SELECT password_hash FROM students WHERE id = ?', [studentOne.id]);
    expect(stored.password_hash).not.toBe(password);
    expect(await bcrypt.compare(password, stored.password_hash)).toBe(true);
    expect(await queryOne('SELECT id FROM users WHERE email = ?', [studentOne.email])).toBe(null);
  });

  it('blocks student cookies from administrator APIs and ignores administrator JWTs on the student API', async (context) => {
    if (!dbAvailable) return context.skip();
    expect((await first.get('/api/admin/enquiries')).status).toBe(401);
    expect((await first.delete('/api/admin/services/1')).status).toBe(401);
    const admin = await queryOne("SELECT * FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
    if (admin) {
      const token = signToken(admin);
      expect((await request(app).get('/api/admin/enquiries').set('Authorization', `Bearer ${token}`)).status).toBe(200);
      expect((await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`)).status).toBe(401);
    }
  });

  it('requires student CSRF, persists an enquiry under the authenticated owner, and rejects duplicates', async (context) => {
    if (!dbAvailable) return context.skip();
    const payload = { fullName: studentOne.name, email: studentOne.email, phone: studentOne.phone, serviceInterest: 'Career Counselling', message: 'Student portal integration test.', preferredDate: '2099-12-20', preferredTime: 'Morning (9am–12pm IST)', studentId: studentTwo.id };
    expect((await first.post('/api/enquiries').send(payload)).status).toBe(403);
    expect((await first.post('/api/enquiries').set('X-Student-CSRF-Token', csrfTwo).send(payload)).status).toBe(403);
    const res = await first.post('/api/enquiries').set('X-Student-CSRF-Token', csrfOne).send(payload);
    expect(res.status).toBe(201);
    enquiryId = res.body.data.enquiry.id;
    const stored = await queryOne('SELECT student_id, preferred_date, preferred_time, status FROM enquiries WHERE id = ?', [enquiryId]);
    expect(stored.student_id).toBe(studentOne.id);
    expect(stored.preferred_time).toBe(payload.preferredTime);
    expect(stored.status).toBe('new');
    expect((await first.post('/api/enquiries').set('X-Student-CSRF-Token', csrfOne).send(payload)).status).toBe(409);
  });

  it('returns only the signed-in student’s own enquiries with no CRM or password fields', async (context) => {
    if (!dbAvailable) return context.skip();
    const a = await first.get(`/api/student/dashboard?studentId=${studentTwo.id}`);
    const b = await second.get(`/api/student/dashboard?studentId=${studentOne.id}`);
    expect(a.status).toBe(200);
    expect(a.headers['cache-control']).toBe('no-store');
    expect(a.body.data.enquiries.map((enquiry) => enquiry.id)).toContain(enquiryId);
    expect(b.body.data.enquiries).toEqual([]);
    expect(a.body.data.enquiries[0]).not.toHaveProperty('assignedTo');
    expect(a.body.data.enquiries[0]).not.toHaveProperty('ipAddress');
    expect(a.body.data.student).not.toHaveProperty('passwordHash');
  });

  it('revokes logout sessions on the server and signs in again without changing admin cookies', async (context) => {
    if (!dbAvailable) return context.skip();
    expect((await first.post('/api/student/logout')).status).toBe(403);
    expect((await first.post('/api/student/logout').set('X-Student-CSRF-Token', csrfOne)).status).toBe(200);
    expect((await request(app).get('/api/student/dashboard').set('Cookie', sessionCookies)).status).toBe(401);
    expect((await request(app).post('/api/counselling').set('Cookie', sessionCookies).send({})).status).toBe(401);
    expect((await first.post('/api/student/login').send({ email: studentOne.email, password: 'wrong-password' })).status).toBe(401);
    const login = await first.post('/api/student/login').send({ email: studentOne.email, password });
    expect(login.status).toBe(200);
    expect(login.body.data.student.id).toBe(studentOne.id);
    expect(login.headers['set-cookie'].some((cookie) => cookie.startsWith('g3b_token='))).toBe(false);
  });
});
