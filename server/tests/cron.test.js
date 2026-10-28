import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import env from '../src/config/env.js';
import { youtubeSyncService } from '../src/services/youtubeSyncService.js';

const app = createApp();
const originalSecret = env.cronSecret;

afterEach(() => {
  env.cronSecret = originalSecret;
  vi.restoreAllMocks();
});

describe('protected daily cron endpoint', () => {
  it('rejects requests when the cron secret is not configured', async () => {
    env.cronSecret = '';
    const refresh = vi.spyOn(youtubeSyncService, 'refreshIfDue');
    const response = await request(app).get('/api/cron/youtube-sync');
    expect(response.status).toBe(503);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('requires an exact bearer token and invokes the due-refresh service', async () => {
    env.cronSecret = 'a'.repeat(40);
    const refresh = vi.spyOn(youtubeSyncService, 'refreshIfDue').mockResolvedValue({ synced: false, reason: 'not_due' });

    expect((await request(app).get('/api/cron/youtube-sync').set('Authorization', 'Bearer wrong')).status).toBe(401);
    const response = await request(app).get('/api/cron/youtube-sync').set('Authorization', `Bearer ${env.cronSecret}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ synced: false, reason: 'not_due' });
    expect(refresh).toHaveBeenCalledOnce();
  });
});
