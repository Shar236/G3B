import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { closePool, pingDatabase, query, queryOne } from '../src/config/db.js';
import { signToken } from '../src/middleware/auth.js';

vi.mock('../src/services/notificationService.js', () => ({ notifyEnquiry: vi.fn() }));

const app = createApp();
const one = request.agent(app);
const two = request.agent(app);
const suffix = Date.now().toString(36);
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
let available = false;
let adminToken;
let studentOne;
let studentTwo;
let csrfOne;
let assignmentId;
let fileId;
let submissionId;

beforeAll(async () => {
  try {
    await pingDatabase();
    const admin = await queryOne("SELECT * FROM users WHERE role='admin' AND status='active' LIMIT 1");
    available = Boolean(admin);
    if (admin) adminToken = signToken(admin);
  } catch { available = false; }
});
afterAll(async () => {
  if (assignmentId) await query('DELETE FROM learning_assignments WHERE id=?', [assignmentId]);
  for (const student of [studentOne, studentTwo].filter(Boolean)) await query('DELETE FROM students WHERE id=?', [student.id]);
  await closePool().catch(() => {});
});

describe('private assignment workflow', () => {
  it('rejects anonymous admin and student requests', async () => {
    expect((await request(app).get('/api/admin/learning/assignments')).status).toBe(401);
    expect((await request(app).get('/api/student/learning')).status).toBe(401);
    expect((await request(app).get('/api/student/learning/files/1')).status).toBe(401);
  });
  it('creates two isolated student identities', async (context) => {
    if (!available) return context.skip();
    const register = (agent, number) => agent.post('/api/student/register').send({
      name: `Learning Test ${number}`, email: `learning-${suffix}-${number}@example.com`,
      phone: '+919876543210', password: 'LearningTest!92741',
    });
    const first = await register(one, 1);
    const second = await register(two, 2);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    studentOne = first.body.data.student;
    studentTwo = second.body.data.student;
    csrfOne = first.body.data.csrfToken;
  });
  it('publishes an assignment for only one student and protects its PDF', async (context) => {
    if (!available) return context.skip();
    const auth = { Authorization: `Bearer ${adminToken}` };
    const created = await request(app).post('/api/admin/learning/assignments').set(auth).send({
      title: 'Private PDF work', description: 'Read the guide', instructions: 'Submit a response',
      category: 'resource', dueAt: null, status: 'published',
    });
    expect(created.status).toBe(201);
    assignmentId = created.body.data.id;
    const targets = await request(app).post(`/api/admin/learning/assignments/${assignmentId}/targets`).set(auth).send({ studentIds: [studentOne.id] });
    expect(targets.status).toBe(200);
    const upload = await request(app).post(`/api/admin/learning/assignments/${assignmentId}/files`).set(auth).attach('file', pdf, { filename: 'guide.pdf', contentType: 'application/pdf' });
    expect(upload.status).toBe(201);
    fileId = upload.body.data.id;
    const own = await one.get('/api/student/learning');
    const other = await two.get('/api/student/learning');
    expect(own.body.data.assignments.map((item) => item.id)).toContain(assignmentId);
    expect(other.body.data.assignments.map((item) => item.id)).not.toContain(assignmentId);
    expect((await one.get(`/api/student/learning/files/${fileId}`)).status).toBe(200);
    expect((await two.get(`/api/student/learning/files/${fileId}`)).status).toBe(404);
    expect((await two.get(`/api/student/learning/${assignmentId}`)).status).toBe(404);
  });
  it('requires CSRF for submission and keeps feedback private', async (context) => {
    if (!available) return context.skip();
    const url = `/api/student/learning/${assignmentId}/submission`;
    expect((await one.post(url).attach('file', pdf, { filename: 'work.pdf', contentType: 'application/pdf' })).status).toBe(403);
    expect((await two.post(url).set('X-Student-CSRF-Token', csrfOne).attach('file', pdf, { filename: 'work.pdf', contentType: 'application/pdf' })).status).toBe(403);
    const submitted = await one.post(url).set('X-Student-CSRF-Token', csrfOne).attach('file', pdf, { filename: 'work.pdf', contentType: 'application/pdf' });
    expect(submitted.status).toBe(201);
    submissionId = submitted.body.data.id;
    const review = await request(app).patch(`/api/admin/learning/submissions/${submissionId}`).set('Authorization', `Bearer ${adminToken}`).send({ feedback: 'Well done', marks: '8/10' });
    expect(review.status).toBe(200);
    const own = await one.get(`/api/student/learning/${assignmentId}`);
    expect(own.body.data.feedback).toBe('Well done');
    expect((await two.get(`/api/student/learning/${assignmentId}`)).status).toBe(404);
  });
});
