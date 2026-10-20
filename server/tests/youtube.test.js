import { describe, it, expect, vi } from 'vitest';
import { createYouTubeApi, classifyVideo, parseYouTubeUrl, durationSeconds } from '../src/services/youtubeApi.js';
import { createYouTubeSyncService } from '../src/services/youtubeSyncService.js';

const id = (number) => `test${String(number).padStart(7, '0')}`;
const video = (number, changes = {}) => ({ id: id(number), snippet: { title: `Test upload ${number}`, channelId: 'UC_TEST_G3B', publishedAt: '2026-10-01T00:00:00Z', liveBroadcastContent: 'none' }, contentDetails: { duration: 'PT45S' }, status: { privacyStatus: 'public', uploadStatus: 'processed', embeddable: true }, ...changes });
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const config = { apiKey: 'test-secret-do-not-publish', syncIntervalMinutes: 360, maxPages: 500, timeoutMs: 1000, maxSyncMs: 120000, autoSync: true, shortsPlaylistId: '' };
const repository = () => ({ state: vi.fn(async () => ({ lastSuccessAt: null, lastError: null })), counts: vi.fn(async () => ({ candidates: 0, published: 0, pending: 0, excluded: 0, unavailable: 0 })), list: vi.fn(async () => []), allIds: vi.fn(async () => []), acquireLock: vi.fn(async () => true), fail: vi.fn(async () => {}), commit: vi.fn(async () => {}), register: vi.fn(async (entry) => entry), update: vi.fn(async () => {}) });

describe('official YouTube URL and metadata validation', () => {
  it('accepts supported exact hosts and canonicalizes real ID syntax', () => {
    for (const url of ['https://youtu.be/fET2RhoejWA', 'https://www.youtube.com/watch?v=fET2RhoejWA', 'https://youtube.com/shorts/fET2RhoejWA', 'https://m.youtube.com/embed/fET2RhoejWA']) expect(parseYouTubeUrl(url)).toEqual({ id: 'fET2RhoejWA', url: 'https://www.youtube.com/shorts/fET2RhoejWA' });
    for (const url of ['https://youtube.com.evil.test/shorts/fET2RhoejWA', 'https://youtube.com@evil.test/shorts/fET2RhoejWA', 'https://user:password@youtube.com/shorts/fET2RhoejWA', 'javascript:alert(1)', 'https://youtu.be/fET2RhoejWA/other', 'https://www.youtube.com:8443/watch?v=fET2RhoejWA', 'https://youtube.com/shorts/fET2RhoejWAextra', 'https://youtube.com/watch?v=short']) expect(parseYouTubeUrl(url)).toBeNull();
  });
  it('parses ISO durations without silently accepting malformed/live uploads', () => {
    expect(durationSeconds('PT2M59S')).toBe(179);
    expect(durationSeconds('P1DT1H')).toBe(90000);
    expect(durationSeconds('invalid')).toBeNull();
    expect(durationSeconds('PT')).toBeNull();
    expect(classifyVideo(video(1, { contentDetails: { duration: 'PT3M1S' } }), 'UC_TEST_G3B')).toBeNull();
    expect(classifyVideo(video(1, { liveStreamingDetails: { actualStartTime: '2026-10-01' } }), 'UC_TEST_G3B')).toBeNull();
    expect(classifyVideo(video(1), 'UC_OTHER_CHANNEL')).toBeNull();
  });
  it('never guesses Shorts membership or categories from duration, title, date or player ratio', () => {
    const entry = classifyVideo(video(1, { player: { embedWidth: '270', embedHeight: '480' } }), 'UC_TEST_G3B');
    expect(entry.verifiedShort).toBe(false);
    expect(entry.verificationSource).toBe('pending');
    expect(entry).not.toHaveProperty('category');
    expect(classifyVideo(video(1), 'UC_TEST_G3B', true).verificationSource).toBe('curated_playlist');
    expect(classifyVideo(video(1, { status: { privacyStatus: 'private' } }), 'UC_TEST_G3B').availability).toBe('unavailable');
    expect(classifyVideo(video(1, { status: { privacyStatus: 'public', uploadStatus: 'processed', embeddable: false } }), 'UC_TEST_G3B').availability).toBe('embedding_disabled');
  });
});

describe('official API pagination and safe failure handling', () => {
  it('retrieves all 112 uploads across pages, deduplicates IDs and batches metadata by 50', async () => {
    const ids = Array.from({ length: 112 }, (_, index) => id(index));
    const calls = [];
    const fetchImpl = vi.fn(async (url) => {
      calls.push(new URL(url));
      expect(url.origin).toBe('https://www.googleapis.com');
      if (url.pathname.endsWith('/channels')) {
        expect(url.searchParams.get('forHandle')).toBe('@g3beducation_nerul');
        return response({ items: [{ id: 'UC_TEST_G3B', contentDetails: { relatedPlaylists: { uploads: 'UU_TEST_G3B' } } }] });
      }
      if (url.pathname.endsWith('/playlistItems')) {
        expect(url.searchParams.get('maxResults')).toBe('50');
        const start = Number(url.searchParams.get('pageToken') || 0);
        return response({ items: [...ids.slice(start, start + 50), ...(start === 50 ? [ids[0]] : [])].map((videoId) => ({ contentDetails: { videoId } })), ...(start + 50 < ids.length ? { nextPageToken: String(start + 50) } : {}) });
      }
      const batch = url.searchParams.get('id').split(',');
      expect(batch.length).toBeLessThanOrEqual(50);
      return response({ items: batch.map((item) => ({ id: item })) });
    });
    const api = createYouTubeApi({ apiKey: config.apiKey, fetchImpl });
    expect(await api.channel()).toEqual({ channelId: 'UC_TEST_G3B', uploadsPlaylistId: 'UU_TEST_G3B' });
    const uploads = await api.playlist('UU_TEST_G3B');
    expect(uploads).toEqual(ids);
    expect((await api.videos([...uploads, ids[0]])).size).toBe(112);
    expect(calls.filter((call) => call.pathname.endsWith('/playlistItems'))).toHaveLength(3);
    expect(calls.filter((call) => call.pathname.endsWith('/videos'))).toHaveLength(3);
  });
  it('fails a page cap or repeated page token rather than returning partial success', async () => {
    const fetchImpl = vi.fn(async () => response({ items: [{ contentDetails: { videoId: id(1) } }], nextPageToken: 'repeat' }));
    await expect(createYouTubeApi({ apiKey: config.apiKey, fetchImpl, maxPages: 1 }).playlist('uploads')).rejects.toThrow('page limit');
    await expect(createYouTubeApi({ apiKey: config.apiKey, fetchImpl, maxPages: 5 }).playlist('uploads')).rejects.toThrow('repeated pagination');
  });
  it('redacts quota/provider messages, does not retry quota errors', async () => {
    const fetchImpl = vi.fn(async () => response({ error: { message: `Bad key ${config.apiKey}`, errors: [{ reason: 'quotaExceeded' }] } }, 403));
    await expect(createYouTubeApi({ apiKey: config.apiKey, fetchImpl }).channel()).rejects.toThrow('quota is exhausted');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    try { await createYouTubeApi({ apiKey: config.apiKey, fetchImpl }).channel(); } catch (error) { expect(String(error)).not.toContain(config.apiKey); }
  });
  it('bounds transient retries and network errors without leaking request URLs', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error(`fetch failed https://example.test?key=${config.apiKey}`); });
    const sleep = vi.fn(async () => {});
    await expect(createYouTubeApi({ apiKey: config.apiKey, fetchImpl, sleep }).channel()).rejects.toThrow('temporarily unavailable');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    const retryFetch = vi.fn().mockResolvedValueOnce(response({}, 503)).mockResolvedValue(response({ items: [] }));
    expect(await createYouTubeApi({ apiKey: config.apiKey, fetchImpl: retryFetch, sleep }).videos([id(1)])).toEqual(new Map());
    expect(retryFetch).toHaveBeenCalledTimes(2);
  });
});

describe('YouTube cache synchronization and manual registry', () => {
  it('commits one complete deduplicated snapshot with curated-only confirmation', async () => {
    const repo = repository();
    repo.allIds.mockResolvedValue([id(3)]);
    const client = { channel: vi.fn(async () => ({ channelId: 'UC_TEST_G3B', uploadsPlaylistId: 'uploads' })), playlist: vi.fn(async (playlist) => playlist === 'curated' ? [id(2), id(4)] : [id(1), id(2)]), videos: vi.fn(async () => new Map([[id(1), video(1)], [id(2), video(2)], [id(4), video(4, { snippet: { channelId: 'UC_OTHER' } })]])) };
    const service = createYouTubeSyncService({ config: { ...config, shortsPlaylistId: 'curated' }, repo, apiFactory: () => client });
    const { result } = await service.sync();
    expect(result).toMatchObject({ uploadsScanned: 2, candidatesRetrieved: 2, confirmedByPlaylist: 1, unavailable: 1 });
    expect(client.videos).toHaveBeenCalledWith([id(1), id(2), id(4), id(3)]);
    expect(repo.commit).toHaveBeenCalledTimes(1);
    const snapshot = repo.commit.mock.calls[0][0];
    expect(snapshot.entries[0].verifiedShort).toBe(false);
    expect(snapshot.entries[1].verifiedShort).toBe(true);
    expect(snapshot.entries.every((entry) => entry.channelId === 'UC_TEST_G3B')).toBe(true);
    expect(repo.fail).not.toHaveBeenCalled();
  });
  it('retains the complete prior cache when a later page or metadata batch fails', async () => {
    const repo = repository();
    const service = createYouTubeSyncService({ config, repo, apiFactory: () => ({ channel: async () => ({ channelId: 'UC_TEST_G3B', uploadsPlaylistId: 'uploads' }), playlist: async () => { throw new Error(`fetch key=${config.apiKey}`); } }) });
    await expect(service.sync()).rejects.toThrow('previous video list has been retained');
    expect(repo.commit).not.toHaveBeenCalled();
    expect(repo.fail.mock.calls[0][0]).not.toContain(config.apiKey);
  });
  it('blocks concurrent workers rather than making another set of API calls', async () => {
    const repo = repository(); repo.acquireLock.mockResolvedValue(false);
    const apiFactory = vi.fn();
    const service = createYouTubeSyncService({ config, repo, apiFactory });
    await expect(service.sync()).rejects.toMatchObject({ status: 409 });
    expect(apiFactory).not.toHaveBeenCalled();
    expect(repo.fail).not.toHaveBeenCalled();
  });
  it('keeps URLs pending without credentials, blocks sync, and exposes only presence in status', async () => {
    const repo = repository(), apiFactory = vi.fn();
    const service = createYouTubeSyncService({ config: { ...config, apiKey: '' }, repo, apiFactory });
    expect(await service.register('https://youtu.be/fET2RhoejWA')).toMatchObject({ channelVerified: false, availability: 'pending' });
    await expect(service.sync()).rejects.toMatchObject({ status: 503 });
    const status = await service.status();
    expect(status.configured).toBe(false);
    expect(status).not.toHaveProperty('apiKey');
    expect(status).not.toHaveProperty('shortsPlaylistId');
    expect(apiFactory).not.toHaveBeenCalled();
  });
  it('rejects cross-channel, deleted and embedding-disabled URLs with configured API', async () => {
    const repo = repository();
    let fixture = video(1, { snippet: { channelId: 'UC_OTHER' } });
    const service = createYouTubeSyncService({ config, repo, apiFactory: () => ({ channel: async () => ({ channelId: 'UC_TEST_G3B' }), videos: async () => new Map(fixture ? [[id(1), fixture]] : []) }) });
    await expect(service.register(`https://youtube.com/shorts/${id(1)}`)).rejects.toThrow('Only videos belonging');
    fixture = null;
    await expect(service.register(`https://youtube.com/shorts/${id(1)}`)).rejects.toThrow('private, deleted');
    fixture = video(1, { status: { privacyStatus: 'public', uploadStatus: 'processed', embeddable: false } });
    await expect(service.register(`https://youtube.com/shorts/${id(1)}`)).rejects.toThrow('does not allow embedding');
    expect(repo.register).not.toHaveBeenCalled();
  });
});
