import env from '../config/env.js';
import youtubeRepository from '../repositories/youtubeRepository.js';
import { createYouTubeApi, classifyVideo, parseYouTubeUrl, CHANNEL_HANDLE, CHANNEL_URL } from './youtubeApi.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

export const CLASSIFICATION_NOTICE = 'YouTube Data API v3 does not identify Shorts directly. Uploads up to 180 seconds are review candidates. Confirm actual Shorts in the admin panel, or configure an owner-curated Shorts playlist for automatic publishing. Categories are assigned by editors.';

/** Injectable official API and repository keep pagination/failure behavior testable. */
export function createYouTubeSyncService({ config = env.youtube, repo = youtubeRepository, apiFactory = createYouTubeApi } = {}) {
  let running = false;
  const api = () => apiFactory({ apiKey: config.apiKey, maxPages: config.maxPages, timeoutMs: config.timeoutMs, maxSyncMs: config.maxSyncMs });
  const safeError = (error) => error instanceof ApiError && error.status < 600 ? error.message : 'YouTube synchronization failed. The previous video list has been retained. Check server availability and retry.';
  return {
    async status() {
      const [state, counts] = await Promise.all([repo.state(), repo.counts()]);
      const { lockExpiresAt, ...persisted } = state;
      return { ...persisted, configured: Boolean(config.apiKey), curatedPlaylistConfigured: Boolean(config.shortsPlaylistId), channelHandle: CHANNEL_HANDLE, channelUrl: CHANNEL_URL, running: running || Boolean(lockExpiresAt && new Date(lockExpiresAt).getTime() > Date.now()), intervalMinutes: config.syncIntervalMinutes, autoSync: config.autoSync, classificationNotice: CLASSIFICATION_NOTICE, counts };
    },
    list: () => repo.list(),
    async refreshIfDue() {
      await repo.expireMetadata();
      if (!config.apiKey || !config.autoSync) return { synced: false, reason: 'automatic_sync_disabled' };
      const state = await repo.state();
      const lastAttempt = state.lastAttemptAt ? new Date(state.lastAttemptAt).getTime() : 0;
      if (Date.now() - lastAttempt < config.syncIntervalMinutes * 60000) {
        return { synced: false, reason: 'not_due' };
      }
      return { synced: true, ...(await this.sync()) };
    },
    async sync() {
      if (!config.apiKey) {
        const message = 'Configure YOUTUBE_API_KEY on the backend to verify channel membership and synchronize videos. Existing videos are unchanged.';
        await repo.fail(message);
        throw new ApiError(503, message);
      }
      if (running) throw new ApiError(409, 'YouTube synchronization is already running.');
      running = true;
      let acquired = false;
      try {
        acquired = await repo.acquireLock(Math.ceil(config.maxSyncMs / 1000) + 30);
        if (!acquired) throw new ApiError(409, 'YouTube synchronization is already running.');
        const client = api();
        const { channelId, uploadsPlaylistId } = await client.channel();
        const uploadIds = await client.playlist(uploadsPlaylistId);
        const curatedIds = new Set(config.shortsPlaylistId ? await client.playlist(config.shortsPlaylistId) : []);
        const previousIds = await repo.allIds();
        const videos = await client.videos([...new Set([...uploadIds, ...curatedIds, ...previousIds])]);
        const entries = [], result = { uploadsScanned: uploadIds.length, candidatesRetrieved: 0, confirmedByPlaylist: 0, unavailable: 0, skipped: 0 };
        for (const [id, video] of videos) {
          const entry = classifyVideo(video, channelId, curatedIds.has(id));
          if (!entry) { result.skipped += 1; continue; }
          entries.push(entry);
          if (entry.availability !== 'available') result.unavailable += 1;
          if (entry.verifiedShort) result.confirmedByPlaylist += 1;
        }
        result.unavailable += [...new Set([...uploadIds, ...previousIds])].filter((id) => !videos.has(id)).length;
        result.candidatesRetrieved = entries.length;
        await repo.commit({ entries, channelId, uploadsPlaylistId, result });
        return { status: await this.status(), result };
      } catch (error) {
        if (acquired) await repo.fail(safeError(error));
        if (error instanceof ApiError) throw error;
        throw new ApiError(503, safeError(error));
      } finally { running = false; }
    },
    async register(url) {
      const parsed = parseYouTubeUrl(url);
      if (!parsed) throw ApiError.badRequest('Enter a legitimate YouTube watch, Shorts, embed, or youtu.be URL.');
      if (!config.apiKey) return repo.register({ youtubeId: parsed.id, sourceUrl: parsed.url, channelVerified: false, availability: 'pending' });
      const client = api();
      const { channelId } = await client.channel();
      const videos = await client.videos([parsed.id]);
      const video = videos.get(parsed.id);
      if (!video) throw ApiError.badRequest('This YouTube video is private, deleted, or unavailable.');
      if (video.snippet?.channelId !== channelId) throw ApiError.badRequest('Only videos belonging to @g3beducation_nerul can be added.');
      const entry = classifyVideo(video, channelId);
      if (!entry) throw ApiError.badRequest('This video is live or longer than 180 seconds and is not an eligible Shorts candidate.');
      if (entry.availability !== 'available') throw ApiError.badRequest('This video is unavailable or does not allow embedding.');
      return repo.register(entry);
    },
    async saveManual(payload) {
      const url = (payload.url || '').trim();
      const parsed = parseYouTubeUrl(url);
      if (!parsed) throw ApiError.badRequest('Enter a legitimate YouTube watch, Shorts, embed, or youtu.be URL.');

      const validCategories = ['What Parents Say', 'Student Review'];
      const cleanCategory = validCategories.includes(payload.category) ? payload.category : (payload.category || 'Student Review');
      const cleanTitle = (payload.title || '').trim() || `${cleanCategory} - Testimonial`;
      const activeVal = payload.isActive === false || payload.isActive === 0 || payload.isActive === 'false' ? 0 : 1;

      const isShort = url.toLowerCase().includes('/shorts/');
      const orientation = isShort ? 'portrait' : 'landscape';
      const canonicalUrl = isShort ? `https://www.youtube.com/shorts/${parsed.id}` : parsed.url;
      const thumbnailUrl = `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`;

      const sortOrder = payload.sortOrder !== undefined && payload.sortOrder !== '' && !Number.isNaN(Number(payload.sortOrder)) ? Number(payload.sortOrder) : null;

      return repo.saveManual({
        youtubeId: parsed.id,
        sourceUrl: canonicalUrl,
        title: cleanTitle,
        category: cleanCategory,
        orientation,
        thumbnailUrl,
        sortOrder,
        isActive: activeVal,
      });
    },
    update: (id, updates) => repo.update(id, updates),
    remove: (id) => repo.update(id, { excluded: true }),
  };
}

export const youtubeSyncService = createYouTubeSyncService();

/** One modest timer per process; database lease prevents concurrent workers.
 * Page loads use cached data and never call YouTube. */
export function startYouTubeSyncScheduler() {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      await youtubeSyncService.refreshIfDue();
    } catch (error) {
      // All API errors are normalized; never log request URLs or provider payloads.
      logger.warn('YouTube background refresh did not complete', { message: error instanceof ApiError ? error.message : 'Database or service unavailable.' });
    }
  };
  const first = setTimeout(tick, 1000);
  const timer = setInterval(tick, 60000);
  first.unref(); timer.unref();
  return () => { stopped = true; clearTimeout(first); clearInterval(timer); };
}
