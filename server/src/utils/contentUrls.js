/** Resolve supported video providers without accepting lookalike hostnames. */
export function parseVideoUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    let id;
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0];
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:shorts|embed)\/([^/]+)/.exec(url.pathname)?.[1];
    } else if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
      id = /^(?:\/video)?\/(\d+)\/?$/.exec(url.pathname)?.[1];
      return id ? { provider: 'vimeo', id } : null;
    }
    return /^[\w-]{11}$/.test(id || '') ? { provider: 'youtube', id } : null;
  } catch { return null; }
}

/** Assets may use trusted browser HTTP(S) schemes or local root-relative paths. */
export function isSafeAssetUrl(value) {
  if (typeof value !== 'string' || !value || /[\s\u0000-\u001f\\]/.test(value)) return false;
  if (value.startsWith('/')) return !value.startsWith('//') && !/(?:^|\/)\.\.(?:\/|$)/.test(value);
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}
