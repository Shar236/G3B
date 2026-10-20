import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import crypto from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { query, queryOne, pingDatabase, closePool } from '../src/config/db.js';
import { usersRepository } from '../src/repositories/userRepository.js';
import { videosRepository } from '../src/repositories/catalogRepository.js';
import youtubeRepository from '../src/repositories/youtubeRepository.js';
import { signToken } from '../src/middleware/auth.js';
import env from '../src/config/env.js';

const app = createApp();
const fixtureId = `49${crypto.randomInt(100000000, 999999999)}`;
const fixture = { youtubeId: fixtureId, sourceUrl: `https://www.youtube.com/shorts/${fixtureId}`, title: 'Temporary YouTube registry test', channelId: 'UC_TEST_ONLY', channelVerified: true, verifiedShort: false, verificationSource: 'pending', durationSeconds: 45, publishedAt: '2026-10-01T00:00:00Z', thumbnailUrl: `https://i.ytimg.com/vi/${fixtureId}/hqdefault.jpg`, availability: 'available' };
let available = false;
let state;
let canTestSnapshot = false;
let stateDirty = false;
const users = {};
const auth = (user) => ({ Authorization: `Bearer ${signToken(user)}` });

beforeAll(async () => {
  try { await pingDatabase(); available = true; } catch { return; }
  state = await queryOne('SELECT * FROM youtube_sync_state WHERE id = 1');
  // Full snapshot/retention operations are exercised only on an empty cache
  // without live API credentials, so running tests never changes real imports.
  canTestSnapshot = !env.youtube.apiKey && Number((await queryOne('SELECT COUNT(*) AS total FROM youtube_short_registry')).total) === 0;
  for (const role of ['admin', 'editor', 'staff']) users[role] = await usersRepository.create({ name: 'Temporary YouTube route test', email: `youtube.${fixtureId}.${role}@example.test`, passwordHash: 'unused-password-hash', role });
});
afterEach(async () => {
  if (!available) return;
  await query('DELETE FROM youtube_short_registry WHERE youtube_id = ?', [fixtureId]);
  await query('DELETE FROM video_testimonials WHERE youtube_id = ?', [fixtureId]);
  if (stateDirty) {
    await query('UPDATE youtube_sync_state SET channel_id = ?, uploads_playlist_id = ?, last_attempt_at = ?, last_success_at = ?, last_error = ?, last_result = ?, lock_expires_at = ? WHERE id = 1', [state.channel_id, state.uploads_playlist_id, state.last_attempt_at, state.last_success_at, state.last_error, typeof state.last_result === 'object' && state.last_result !== null ? JSON.stringify(state.last_result) : state.last_result, state.lock_expires_at]);
    stateDirty = false;
  }
});
afterAll(async () => {
  if (available) {
    for (const user of Object.values(users)) {
      await query('DELETE FROM audit_logs WHERE user_id = ?', [user.id]);
      await query('DELETE FROM users WHERE id = ?', [user.id]);
    }
  }
  await closePool();
});

describe('YouTube registry persistence', () => {
  it('holds unverified URLs pending and prevents publishing before channel verification', async (context) => {
    if (!available) { context.skip(); return; }
    const row = await youtubeRepository.register({ youtubeId: fixtureId, sourceUrl: fixture.sourceUrl });
    expect(row.channelVerified).toBe(false);
    expect(row.availability).toBe('pending');
    await expect(youtubeRepository.update(row.id, { verifiedShort: true })).rejects.toThrow('Refresh and verify');
    expect((await videosRepository.list({ activeOnly: true })).some((video) => video.youtubeId === fixtureId)).toBe(false);
  });
  it('deduplicates registration and preserves editor titles, categories, visibility and order across refresh', async (context) => {
    if (!available || !canTestSnapshot) { context.skip(); return; }
    stateDirty = true;
    const row = await youtubeRepository.register(fixture);
    const duplicate = await youtubeRepository.register(fixture);
    expect(duplicate.id).toBe(row.id);
    const approved = await youtubeRepository.update(row.id, { verifiedShort: true, title: 'Editor-written title', category: 'What Parents Say' });
    expect(approved.videoId).toBeGreaterThan(0);
    expect(approved.isActive).toBe(true);
    await videosRepository.update(approved.videoId, { sortOrder: 617, isActive: false });
    await youtubeRepository.commit({ entries: [{ ...fixture, title: 'Changed API title' }], channelId: fixture.channelId, uploadsPlaylistId: 'UU_TEST_ONLY', result: { candidatesRetrieved: 1 } });
    const saved = await youtubeRepository.find(row.id);
    expect(saved).toMatchObject({ title: 'Editor-written title', category: 'What Parents Say', verifiedShort: true, isActive: false });
    expect((await videosRepository.findById(approved.videoId)).sortOrder).toBe(617);
    expect((await query('SELECT id FROM video_testimonials WHERE youtube_id = ?', [fixtureId]))).toHaveLength(1);
  });
  it('hides excluded/unavailable videos, keeps their metadata, and prevents deleted records reimporting', async (context) => {
    if (!available || !canTestSnapshot) { context.skip(); return; }
    stateDirty = true;
    const row = await youtubeRepository.register(fixture);
    const approved = await youtubeRepository.update(row.id, { verifiedShort: true, category: 'Student Review' });
    expect((await videosRepository.list({ activeOnly: true })).some((video) => video.youtubeId === fixtureId)).toBe(true);
    await youtubeRepository.update(row.id, { excluded: true });
    expect((await videosRepository.list({ activeOnly: true })).some((video) => video.youtubeId === fixtureId)).toBe(false);
    expect((await videosRepository.findById(approved.videoId)).category).toBe('Student Review');
    await youtubeRepository.update(row.id, { excluded: false });
    await youtubeRepository.commit({ entries: [{ ...fixture, availability: 'embedding_disabled' }], channelId: fixture.channelId, uploadsPlaylistId: 'UU_TEST_ONLY', result: {} });
    expect((await videosRepository.list({ activeOnly: true })).some((video) => video.youtubeId === fixtureId)).toBe(false);
    await videosRepository.remove(approved.videoId);
    await youtubeRepository.commit({ entries: [{ ...fixture, verifiedShort: true, verificationSource: 'curated_playlist' }], channelId: fixture.channelId, uploadsPlaylistId: 'UU_TEST_ONLY', result: {} });
    expect((await youtubeRepository.find(row.id)).excluded).toBe(true);
    expect((await query('SELECT id FROM video_testimonials WHERE youtube_id = ?', [fixtureId]))).toHaveLength(0);
  });
  it('expires stale API metadata and suppresses it publicly while preserving editor data', async (context) => {
    if (!available || !canTestSnapshot) { context.skip(); return; }
    stateDirty = true;
    const row = await youtubeRepository.register(fixture);
    await youtubeRepository.update(row.id, { verifiedShort: true, title: 'Editor-provided title', category: '' });
    await query('UPDATE youtube_short_registry SET last_checked_at = UTC_TIMESTAMP() - INTERVAL 31 DAY WHERE id = ?', [row.id]);
    expect((await videosRepository.list({ activeOnly: true })).some((video) => video.youtubeId === fixtureId)).toBe(false);
    await youtubeRepository.expireMetadata();
    expect(await youtubeRepository.find(row.id)).toMatchObject({ title: 'Editor-provided title', thumbnailUrl: null, durationSeconds: null, publishedAt: null, availability: 'pending', channelVerified: false, channelId: null });
  });
  it('respects an explicit administrator unconfirmation even when a curated playlist confirms it later', async (context) => {
    if (!available || !canTestSnapshot) { context.skip(); return; }
    stateDirty = true;
    const row = await youtubeRepository.register(fixture);
    const approved = await youtubeRepository.update(row.id, { verifiedShort: true, category: 'Student Review' });
    await youtubeRepository.update(row.id, { verifiedShort: false });
    await youtubeRepository.commit({ entries: [{ ...fixture, verifiedShort: true, verificationSource: 'curated_playlist' }], channelId: fixture.channelId, uploadsPlaylistId: 'UU_TEST_ONLY', result: {} });
    expect(await youtubeRepository.find(row.id)).toMatchObject({ verifiedShort: false, verificationSource: 'admin', videoId: approved.videoId, category: 'Student Review' });
    expect((await videosRepository.list({ activeOnly: true })).some((video) => video.youtubeId === fixtureId)).toBe(false);
  });
  it('preserves legacy editor title, category, order and visibility when first linked by synchronization', async (context) => {
    if (!available || !canTestSnapshot) { context.skip(); return; }
    stateDirty = true;
    const legacy = await videosRepository.create({ title: 'Legacy editor title', category: 'What Parents Say', youtubeId: fixtureId, youtubeUrl: fixture.sourceUrl, sortOrder: 713, isActive: false });
    await youtubeRepository.commit({ entries: [{ ...fixture, title: 'Different API title', verifiedShort: true, verificationSource: 'curated_playlist' }], channelId: fixture.channelId, uploadsPlaylistId: 'UU_TEST_ONLY', result: {} });
    const registry = (await youtubeRepository.list()).find((entry) => entry.youtubeId === fixtureId);
    expect(registry).toMatchObject({ videoId: legacy.id, title: 'Legacy editor title', titleOverridden: true, category: 'What Parents Say', isActive: false });
    expect(await videosRepository.findById(legacy.id)).toMatchObject({ title: 'Legacy editor title', category: 'What Parents Say', sortOrder: 713, isActive: false });
    expect(await query('SELECT id FROM video_testimonials WHERE youtube_id = ?', [fixtureId])).toHaveLength(1);
  });
  it('applies exclusion across legacy duplicate YouTube rows without hiding a same-ID Vimeo video', async (context) => {
    if (!available) { context.skip(); return; }
    const row = await youtubeRepository.register(fixture);
    const approved = await youtubeRepository.update(row.id, { verifiedShort: true, category: '' });
    await videosRepository.create({ title: 'Temporary duplicate YouTube record', youtubeId: fixtureId, youtubeUrl: fixture.sourceUrl, sortOrder: 0, isActive: true });
    const vimeo = await videosRepository.create({ title: 'Temporary Vimeo same-ID record', youtubeId: fixtureId, youtubeUrl: `https://vimeo.com/${fixtureId}`, sortOrder: 0, isActive: true });
    expect((await videosRepository.list({ activeOnly: true })).filter((video) => video.youtubeId === fixtureId)).toHaveLength(2);
    await videosRepository.remove(approved.videoId);
    const displayed = (await videosRepository.list({ activeOnly: true })).filter((video) => video.youtubeId === fixtureId);
    expect(displayed).toHaveLength(1);
    expect(displayed[0].id).toBe(vimeo.id);
  });
});

describe('YouTube administrative route protection', () => {
  it('requires authentication for every registry/status/synchronization route', async () => {
    for (const [method, path] of [['get', '/api/admin/youtube-shorts'], ['get', '/api/admin/youtube-shorts/status'], ['post', '/api/admin/youtube-shorts/sync'], ['post', '/api/admin/youtube-shorts'], ['patch', '/api/admin/youtube-shorts/1'], ['delete', '/api/admin/youtube-shorts/1']]) expect((await request(app)[method](path)).status).toBe(401);
  });
  it('allows editors, rejects staff, validates URLs and protects cookie mutations with CSRF', async (context) => {
    if (!available) { context.skip(); return; }
    expect((await request(app).get('/api/admin/youtube-shorts/status').set(auth(users.editor))).status).toBe(200);
    expect((await request(app).get('/api/admin/youtube-shorts/status').set(auth(users.staff))).status).toBe(403);
    const invalid = await request(app).post('/api/admin/youtube-shorts').set(auth(users.editor)).send({ url: 'https://youtube.com.evil.test/shorts/fET2RhoejWA' });
    expect(invalid.status).toBe(422);
    const csrf = await request(app).post('/api/admin/youtube-shorts/sync').set('Cookie', `g3b_token=${signToken(users.admin)}`);
    expect(csrf.status).toBe(403);
    expect(csrf.body.error).toContain('CSRF');
    const status = await request(app).get('/api/admin/youtube-shorts/status').set(auth(users.admin));
    expect(status.body.data).not.toHaveProperty('apiKey');
    expect(status.body.data).not.toHaveProperty('shortsPlaylistId');
    expect((await request(app).get('/api/youtube-shorts/status')).status).toBe(404);
  });
  it('prevents generic YouTube creates or identity changes bypassing registry verification', async (context) => {
    if (!available) { context.skip(); return; }
    const row = await youtubeRepository.register(fixture);
    const approved = await youtubeRepository.update(row.id, { verifiedShort: true, category: '' });
    const swap = await request(app).patch(`/api/admin/videos/${approved.videoId}`).set(auth(users.editor)).send({ youtubeId: 'fET2RhoejWA', youtubeUrl: 'https://youtu.be/fET2RhoejWA' });
    expect(swap.status).toBe(400);
    const changeProvider = await request(app).patch(`/api/admin/videos/${approved.videoId}`).set(auth(users.editor)).send({ youtubeId: '123456789', youtubeUrl: 'https://vimeo.com/123456789' });
    expect(changeProvider.status).toBe(400);
    const create = await request(app).post('/api/admin/videos').set(auth(users.editor)).send({ title: 'Blocked direct identity', youtubeId: fixtureId, youtubeUrl: fixture.sourceUrl, orientation: 'portrait', sortOrder: 0, isActive: true });
    expect(create.status).toBe(400);
    expect((await request(app).patch(`/api/admin/videos/${approved.videoId}`).set(auth(users.editor)).send({ title: 'Allowed metadata edit' })).status).toBe(200);
  });
});
