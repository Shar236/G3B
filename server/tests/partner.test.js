import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pingDatabase, closePool } from '../src/config/db.js';

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

describe('Partner Enquiries API', () => {
  it('rejects an empty partner enquiry with validation errors', async () => {
    const res = await request(app)
      .post('/api/partner-enquiries')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.details).toHaveProperty('fullName');
    expect(res.body.details).toHaveProperty('email');
    expect(res.body.details).toHaveProperty('phone');
    expect(res.body.details).toHaveProperty('organizationName');
    expect(res.body.details).toHaveProperty('organizationType');
    expect(res.body.details).toHaveProperty('location');
    expect(res.body.details).toHaveProperty('partnershipInterest');
    expect(res.body.details).toHaveProperty('message');
    expect(res.body.details).toHaveProperty('consent');
  });

  it('rejects an invalid work email and invalid phone number', async () => {
    const res = await request(app)
      .post('/api/partner-enquiries')
      .send({
        fullName: 'Jane Doe',
        organizationName: 'Global High School',
        email: 'not-an-email',
        phone: 'abc',
        organizationType: 'School / Educational Institution',
        location: 'Navi Mumbai',
        partnershipInterest: 'School Career Orientation Workshops',
        message: 'Looking forward to collaboration.',
        consent: true,
      });

    expect(res.status).toBe(422);
    expect(res.body.details).toHaveProperty('email');
    expect(res.body.details).toHaveProperty('phone');
  });

  it('traps spam bot via honeypot and responds with success without saving', async () => {
    const res = await request(app)
      .post('/api/partner-enquiries')
      .send({
        fullName: 'Bot Spammer',
        organizationName: 'Spam Corp',
        email: 'bot@spam.com',
        phone: '+919820000000',
        organizationType: 'Other Organization',
        location: 'Unknown',
        partnershipInterest: 'General Educational Collaboration',
        message: 'Spam message',
        consent: true,
        hp_address: 'http://spam-link.ru',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.referenceId).toBe('HONEYPOT-DISCARD');
  });

  it('rejects unauthorized access to the admin partner enquiries endpoint', async () => {
    const res = await request(app).get('/api/admin/partner-enquiries');
    expect(res.status).toBe(401);
  });

  it('accepts a valid partner enquiry when database is connected', async () => {
    if (!dbAvailable) return;

    const testPayload = {
      fullName: 'Dr. Ramesh Sharma',
      organizationName: 'Navi Mumbai International Academy',
      email: `ramesh.sharma.${Date.now()}@nmia-edu.org`,
      phone: '+91 98201 12345',
      organizationType: 'School / Educational Institution',
      location: 'Navi Mumbai, India',
      websiteUrl: 'https://nmia-edu.org',
      partnershipInterest: 'School Career Orientation Workshops',
      message: 'We would like to explore career counselling workshops for our Grade 10 and 12 batches.',
      consent: true,
    };

    const res = await request(app)
      .post('/api/partner-enquiries')
      .send(testPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.organizationName).toBe('Navi Mumbai International Academy');
  });
});
