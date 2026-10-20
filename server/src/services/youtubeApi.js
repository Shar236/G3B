import ApiError from '../utils/ApiError.js';

export const CHANNEL_HANDLE = '@g3beducation_nerul';
export const CHANNEL_URL = `https://www.youtube.com/${CHANNEL_HANDLE}/shorts`;
const API_ROOT = 'https://www.googleapis.com/youtube/v3/';
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Strict provider parsing. No redirects, HTML fetches, or user-selected API hosts. */
export function parseYouTubeUrl(input) {
  try {
    const url = new URL(input);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    let id;
    if (url.hostname === 'youtu.be') id = /^\/([\w-]{11})\/?$/.exec(url.pathname)?.[1];
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else id = /^\/(?:shorts|embed)\/([\w-]{11})\/?$/.exec(url.pathname)?.[1];
    }
    return VIDEO_ID.test(id || '') ? { id, url: `https://www.youtube.com/shorts/${id}` } : null;
  } catch { return null; }
}

export function durationSeconds(value) {
  const parts = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(value || '');
  if (!parts || !parts.slice(1).some(Boolean)) return null;
  return Number(parts[1] || 0) * 86400 + Number(parts[2] || 0) * 3600 + Number(parts[3] || 0) * 60 + Number(parts[4] || 0);
}

/** The public API has no isShort flag. Only an owner-curated Shorts playlist
 * or explicit administrator review confirms membership; duration is discovery. */
export function classifyVideo(video, channelId, curated = false) {
  if (video?.snippet?.channelId !== channelId) return null;
  const duration = durationSeconds(video.contentDetails?.duration);
  if (!duration || duration > 180 || video.snippet.liveBroadcastContent !== 'none' || video.liveStreamingDetails) return null;
  return {
    youtubeId: video.id,
    sourceUrl: `https://www.youtube.com/shorts/${video.id}`,
    title: String(video.snippet.title || '').slice(0, 200),
    channelId,
    channelVerified: true,
    verifiedShort: curated,
    verificationSource: curated ? 'curated_playlist' : 'pending',
    durationSeconds: Math.ceil(duration),
    publishedAt: video.snippet.publishedAt || null,
    thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
    availability: video.status?.privacyStatus !== 'public' || video.status?.uploadStatus !== 'processed'
      ? 'unavailable' : video.status?.embeddable === true ? 'available' : 'embedding_disabled',
  };
}

const publicError = (status, reason) => {
  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') return new ApiError(503, 'YouTube API quota is exhausted. The previous video list has been retained; try again after the quota resets.');
  if (status === 400 || status === 401 || status === 403) return new ApiError(503, 'YouTube API access was rejected. Check the backend API key, YouTube Data API v3 access, and key restrictions.');
  return new ApiError(503, 'YouTube is temporarily unavailable. The previous video list has been retained.');
};

export function createYouTubeApi({ apiKey, fetchImpl = globalThis.fetch, timeoutMs = 12000, maxPages = 500, maxSyncMs = 120000, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  const deadline = Date.now() + maxSyncMs;
  const checkDeadline = () => { if (Date.now() >= deadline) throw new ApiError(503, 'YouTube synchronization reached its time limit. The previous video list has been retained.'); };
  async function get(resource, params) {
    if (!apiKey) throw new ApiError(503, 'Configure YOUTUBE_API_KEY on the backend to verify channel membership and synchronize videos.');
    const url = new URL(`${API_ROOT}${resource}`);
    Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    for (let attempt = 0; attempt < 3; attempt += 1) {
      checkDeadline();
      let response;
      try {
        response = await fetchImpl(url, { signal: AbortSignal.timeout(Math.min(timeoutMs, Math.max(1, deadline - Date.now()))), headers: { Accept: 'application/json' } });
      } catch {
        if (attempt < 2) { await sleep(250 * 2 ** attempt); continue; }
        throw publicError(503);
      }
      let body;
      try { body = await response.json(); } catch { throw publicError(503); }
      if (response.ok && !body.error) return body;
      if ((response.status >= 500 || response.status === 429) && attempt < 2) { await sleep(250 * 2 ** attempt); continue; }
      throw publicError(response.status, body.error?.errors?.[0]?.reason);
    }
  }
  return {
    async channel() {
      const result = await get('channels', { part: 'contentDetails', forHandle: CHANNEL_HANDLE });
      const channel = result.items?.[0];
      if (!channel?.id || !channel.contentDetails?.relatedPlaylists?.uploads) throw new ApiError(503, 'The G3B Education channel could not be resolved by the official YouTube API.');
      return { channelId: channel.id, uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads };
    },
    async playlist(playlistId) {
      const ids = new Set(), tokens = new Set();
      let token = '';
      for (let page = 0; page < maxPages; page += 1) {
        const result = await get('playlistItems', { part: 'contentDetails', playlistId, maxResults: 50, ...(token ? { pageToken: token } : {}) });
        for (const item of result.items || []) { const id = item.contentDetails?.videoId; if (VIDEO_ID.test(id || '')) ids.add(id); }
        token = result.nextPageToken || '';
        if (!token) return [...ids];
        if (tokens.has(token)) throw new ApiError(503, 'YouTube returned repeated pagination data. The previous video list has been retained.');
        tokens.add(token);
      }
      throw new ApiError(503, 'YouTube synchronization reached its page limit. Increase YOUTUBE_SYNC_MAX_PAGES before retrying; the previous video list has been retained.');
    },
    async videos(ids) {
      const uniqueIds = [...new Set(ids)].filter((id) => VIDEO_ID.test(id));
      const output = new Map();
      for (let index = 0; index < uniqueIds.length; index += 50) {
        const result = await get('videos', { part: 'snippet,contentDetails,status,player,liveStreamingDetails', id: uniqueIds.slice(index, index + 50).join(','), maxResults: 50, maxWidth: 480, maxHeight: 480 });
        for (const item of result.items || []) if (VIDEO_ID.test(item.id || '')) output.set(item.id, item);
      }
      return output;
    },
  };
}
