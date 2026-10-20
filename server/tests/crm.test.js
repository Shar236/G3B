import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { createApp } from '../src/app.js';
import { query, pingDatabase, closePool } from '../src/config/db.js';
import { signToken } from '../src/middleware/auth.js';
import { subscribersRepository, hashSubscriberToken } from '../src/repositories/subscribersRepository.js';
import { usersRepository } from '../src/repositories/userRepository.js';
import { parseVideoUrl, isSafeAssetUrl } from '../src/utils/contentUrls.js';
import { toCsv } from '../src/utils/csv.js';
import { publicSettings } from '../src/repositories/settingsRepository.js';

const app = createApp();
const runId = crypto.randomBytes(8).toString('hex');
const emails = [];
const userIds = [];
let available = false;
let admin;
let counsellor;
let editor;
const password = `Test-${crypto.randomBytes(12).toString('hex')}`;
const email = (label) => { const value = `${label}.${runId}@example.test`; emails.push(value); return value; };
const auth = (user) => ({ Authorization: `Bearer ${signToken(user)}` });
const cookieValues = (response) => response.headers['set-cookie'].map((cookie) => cookie.split(';')[0]);
const csrfFrom = (cookies) => cookies.find((cookie) => cookie.startsWith('g3b_csrf=')).split('=')[1];

beforeAll(async () => {
  try { await pingDatabase(); available = true; } catch { return; }
  const passwordHash = await bcrypt.hash(password, 4);
  for (const role of ['admin', 'counsellor', 'editor']) {
    const user = await usersRepository.create({ name: 'CRM regression test', email: email(role), passwordHash, role });
    userIds.push(user.id);
    if (role === 'admin') admin = user;
    if (role === 'counsellor') counsellor = user;
    if (role === 'editor') editor = user;
  }
});
afterAll(async () => {
  if (available) {
    for (const address of emails) {
      await query('DELETE FROM enquiries WHERE email = ?', [address]);
      await query('DELETE FROM newsletter_subscribers WHERE email = ?', [address]);
    }
    for (const id of userIds) await query('DELETE FROM users WHERE id = ?', [id]);
  }
  await closePool();
});

describe('CRM data flows', () => {
  it('requires positive consent before accepting a public subscriber', async () => {
    const result = await request(app).post('/api/subscribers').send({ email: email('no-consent'), source: 'guide' });
    expect(result.status).toBe(422);
    expect(result.body.details.consent).toBeTruthy();
  });

  it('stores subscribers idempotently, preserves unsubscribe tokens, and supports filtered export', async (context) => {
    if (!available) { context.skip(); return; }
    const address = email('subscriber');
    const token = crypto.randomBytes(32).toString('hex');
    await subscribersRepository.subscribe({ email: address, source: 'guide', token });
    const result = await request(app).post('/api/subscribers').send({ email: address, source: 'guide', consent: true });
    expect(result.status).toBe(200);
    const rows = await query('SELECT * FROM newsletter_subscribers WHERE email = ?', [address]);
    expect(rows).toHaveLength(1);
    expect(rows[0].unsubscribe_token_hash).toBe(hashSubscriberToken(token));
    expect(rows[0].consent_at).toBeTruthy();
    const list = await request(app).get(`/api/admin/subscribers?source=guide&search=${encodeURIComponent(address)}`).set(auth(counsellor));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).not.toHaveProperty('unsubscribeTokenHash');
    const csv = await request(app).get(`/api/admin/subscribers/export?source=newsletter&search=${encodeURIComponent(address)}`).set(auth(admin));
    expect(csv.status).toBe(200);
    expect(csv.text).not.toContain(address);
    const unsubscribed = await request(app).post('/api/subscribers/unsubscribe').send({ token });
    expect(unsubscribed.status).toBe(200);
    expect((await subscribersRepository.findByEmail(address)).status).toBe('unsubscribed');
  });

  it('persists structured assessment, applies inbox and CSV filters, and guards bulk deletion', async (context) => {
    if (!available) { context.skip(); return; }
    const address = email('assessment');
    const payload = { fullName: 'Assessment Student', email: address, phone: '+919876543210', serviceInterest: 'Grade 9+ Counselling', preferredDestination: 'Canada', currentStatus: 'high_school', targetDegree: 'ug', leadSource: 'assessment' };
    const created = await request(app).post('/api/enquiries').send(payload);
    expect(created.status).toBe(201);
    const id = created.body.data.enquiry.id;
    const list = await request(app).get(`/api/admin/enquiries?segment=school&targetDegree=ug&search=${encodeURIComponent(address)}&sortBy=fullName&sortDir=asc`).set(auth(counsellor));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ currentStatus: 'high_school', targetDegree: 'ug', preferredDestination: 'Canada' });
    const csv = await request(app).get(`/api/admin/enquiries/export?destination=Australia&search=${encodeURIComponent(address)}`).set(auth(admin));
    expect(csv.status).toBe(200);
    expect(csv.text).not.toContain(address);
    const update = await request(app).post('/api/admin/enquiries/bulk').set(auth(counsellor)).send({ ids: [id], action: 'status', status: 'converted' });
    expect(update.status).toBe(200);
    const deletion = await request(app).post('/api/admin/enquiries/bulk').set(auth(counsellor)).send({ ids: [id], action: 'delete' });
    expect(deletion.status).toBe(403);
    const editorInbox = await request(app).get('/api/admin/enquiries').set(auth(editor));
    expect(editorInbox.status).toBe(403);
  });

  it('rejects invalid pagination instead of issuing negative LIMIT or OFFSET', async (context) => {
    if (!available) { context.skip(); return; }
    const result = await request(app).get('/api/admin/enquiries?page=-1&perPage=0').set(auth(admin));
    expect(result.status).toBe(422);
  });
});

describe('revocable administrator sessions', () => {
  it('rotates a CSRF-protected refresh token and detects token-family replay', async (context) => {
    if (!available) { context.skip(); return; }
    const login = await request(app).post('/api/auth/login').send({ email: admin.email, password });
    expect(login.status).toBe(200);
    const original = cookieValues(login);
    expect(login.headers['set-cookie'].find((cookie) => cookie.startsWith('g3b_refresh='))).toContain('HttpOnly');
    const missingCsrf = await request(app).post('/api/auth/refresh-token').set('Cookie', original);
    expect(missingCsrf.status).toBe(403);
    const rotated = await request(app).post('/api/auth/refresh-token').set('Cookie', original).set('X-CSRF-Token', csrfFrom(original));
    expect(rotated.status).toBe(200);
    const nextCookies = cookieValues(rotated);
    expect(nextCookies.find((cookie) => cookie.startsWith('g3b_refresh='))).not.toBe(original.find((cookie) => cookie.startsWith('g3b_refresh=')));
    const replay = await request(app).post('/api/auth/refresh-token').set('Cookie', original).set('X-CSRF-Token', csrfFrom(original));
    expect(replay.status).toBe(401);
    const invalidated = await request(app).post('/api/auth/refresh-token').set('Cookie', nextCookies).set('X-CSRF-Token', csrfFrom(nextCookies));
    expect(invalidated.status).toBe(401);
    const invalidatedAccess = await request(app).get('/api/auth/session').set('Cookie', nextCookies);
    expect(invalidatedAccess.status).toBe(401);
  });

  it('revokes access cookies immediately after a CSRF-protected logout', async (context) => {
    if (!available) { context.skip(); return; }
    const login = await request(app).post('/api/auth/login').send({ email: admin.email, password });
    const cookies = cookieValues(login);
    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookies).set('X-CSRF-Token', csrfFrom(cookies));
    expect(logout.status).toBe(200);
    const replay = await request(app).get('/api/auth/session').set('Cookie', cookies);
    expect(replay.status).toBe(401);
  });

  it('invalidates both access and refresh sessions when credentials change', async (context) => {
    if (!available) { context.skip(); return; }
    const token = signToken(counsellor);
    const login = await request(app).post('/api/auth/login').send({ email: counsellor.email, password });
    expect(login.status).toBe(200);
    const cookies = cookieValues(login);
    await usersRepository.update(counsellor.id, { passwordHash: await bcrypt.hash(password, 4) });
    const result = await request(app).get('/api/auth/session').set('Authorization', `Bearer ${token}`);
    expect(result.status).toBe(401);
    const refresh = await request(app).post('/api/auth/refresh-token').set('Cookie', cookies).set('X-CSRF-Token', csrfFrom(cookies));
    expect(refresh.status).toBe(401);
  });
});

describe('safe content and exports', () => {
  it('never publishes unknown settings or integration credentials', () => {
    expect(publicSettings({ brand_name: 'G3B', google_places_api_key: 'private', future_api_secret: 'private', show_google_reviews: 'true' }))
      .toEqual({ brand_name: 'G3B', show_google_reviews: 'true' });
  });
  it('parses supported video providers while rejecting lookalike hosts and mismatched schemes', () => {
    expect(parseVideoUrl('https://youtube.com/watch?v=fET2RhoejWA')).toEqual({ provider: 'youtube', id: 'fET2RhoejWA' });
    expect(parseVideoUrl('https://vimeo.com/123456789')).toEqual({ provider: 'vimeo', id: '123456789' });
    expect(parseVideoUrl('https://youtube.com.evil.test/watch?v=fET2RhoejWA')).toBeNull();
    expect(parseVideoUrl('javascript:alert(1)')).toBeNull();
    expect(isSafeAssetUrl('/uploads/photo.jpg')).toBe(true);
    expect(isSafeAssetUrl('//evil.test/image.jpg')).toBe(false);
    expect(isSafeAssetUrl('data:text/html,evil')).toBe(false);
  });
  it('neutralises spreadsheet formulas and formats UTC dates', () => {
    const csv = toCsv([{ name: '=HYPERLINK("https://evil.test")', date: new Date('2026-10-20T00:00:00Z') }]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('2026-10-20T00:00:00.000Z');
  });
});
