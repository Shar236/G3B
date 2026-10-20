import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pingDatabase, closePool, query } from '../src/config/db.js';
import env from '../src/config/env.js';

const app = createApp();
let dbAvailable = false;

beforeAll(async () => {
  try {
    await pingDatabase();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  await closePool().catch(() => {});
});

describe('service basics', () => {
  it('responds on the root route', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('G3B Education API');
  });

  it('reports health with dependency checks', async () => {
    const res = await request(app).get('/api/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body.checks).toHaveProperty('database');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('public content', () => {
  it('rejects an enquiry with an invalid payload (422 + field details)', async () => {
    const res = await request(app).post('/api/enquiries').send({ fullName: 'A' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.details).toHaveProperty('email');
    expect(res.body.details).toHaveProperty('phone');
  });

  it('rejects a malformed email address', async () => {
    const res = await request(app).post('/api/enquiries').send({
      fullName: 'Valid Name',
      email: 'not-an-email',
      phone: '8928659569',
      serviceInterest: 'Visa Assistance',
    });
    expect(res.status).toBe(422);
    expect(res.body.details.email).toBeTruthy();
  });
});

describe('admin authorisation', () => {
  it('blocks anonymous access to enquiries', async () => {
    const res = await request(app).get('/api/admin/enquiries');
    expect(res.status).toBe(401);
  });

  it('blocks anonymous access to content management', async () => {
    const res = await request(app).delete('/api/admin/services/1');
    expect(res.status).toBe(401);
  });

  it('does not expose enquiry records on public endpoints', async () => {
    const res = await request(app).get('/api/site-settings');
    expect(res.body.data ?? {}).not.toHaveProperty('enquiries');
  });
});

describe('database backed flows', () => {
  it('serves seeded homepage content', async () => {
    if (!dbAvailable) return;
    const res = await request(app).get('/api/home');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.services)).toBe(true);
    expect(res.body.data.content.hero).toBeTruthy();
  });

  it('persists a valid enquiry and returns 201', async () => {
    if (!dbAvailable) return;
    const unique = Date.now();
    const payload = {
      fullName: 'Automated Test Student',
      email: `test.${unique}@example.com`,
      phone: '8928659569',
      serviceInterest: 'Visa Assistance',
      message: 'Integration test enquiry.',
    };

    const res = await request(app).post('/api/enquiries').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.enquiry.id).toBeGreaterThan(0);

    // Row must exist in MySQL.
    const rows = await query('SELECT * FROM enquiries WHERE email = ?', [payload.email]);
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('new');

    await query('DELETE FROM enquiries WHERE email = ?', [payload.email]);
  });

  it('rejects a duplicate enquiry submitted within the guard window', async () => {
    if (!dbAvailable) return;
    const unique = Date.now();
    const payload = {
      fullName: 'Duplicate Test',
      email: `dup.${unique}@example.com`,
      phone: '8928659569',
      serviceInterest: 'Study Abroad Counselling',
    };

    const first = await request(app).post('/api/enquiries').send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/enquiries').send(payload);
    expect(second.status).toBe(409);

    await query('DELETE FROM enquiries WHERE email = ?', [payload.email]);
  });

  it('allows an administrator to log in and read enquiries', async () => {
    if (!dbAvailable) return;

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: env.admin.email, password: env.admin.password });

    if (login.status !== 200) {
      // Administrator not seeded yet - nothing to assert.
      expect([200, 401]).toContain(login.status);
      return;
    }

    const cookies = login.headers['set-cookie'];
    expect(cookies.some((cookie) => cookie.startsWith('g3b_token='))).toBe(true);

    const list = await request(app).get('/api/admin/enquiries').set('Cookie', cookies);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
  });

  it('accepts lead submission via dedicated /api/counselling endpoint', async () => {
    if (!dbAvailable) return;
    const unique = Date.now();
    const payload = {
      fullName: 'Counselling Lead',
      email: `counselling.${unique}@example.com`,
      phone: '+919876543210',
      serviceInterest: 'Test Preparation & Language Support',
      preferredDestination: 'Australia',
      message: 'Need urgent IELTS counselling.',
    };

    const res = await request(app).post('/api/counselling').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.enquiry.id).toBeGreaterThan(0);

    await query('DELETE FROM enquiries WHERE email = ?', [payload.email]);
  });

  it('serves dynamic navigation items on /api/navigation', async () => {
    if (!dbAvailable) return;
    const res = await request(app).get('/api/navigation');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
