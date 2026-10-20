# G3B Education YouTube Shorts

The existing video testimonials carousel uses cached records from the Express /
MySQL backend. Opening the homepage never calls the YouTube Data API. The two
existing testimonials are retained; no channel membership has been inferred for
those legacy records.

## Configure synchronization

1. Enable **YouTube Data API v3** in the Google Cloud project used for this site.
2. Create a backend API key and restrict it to YouTube Data API v3 and the
   production server's outbound IP addresses where available.
3. Set `YOUTUBE_API_KEY` in `server/.env` or the server's secret environment.
   Never put it in a `VITE_*` variable, site setting, or client code.
4. Run `npm run migrate --prefix server`, then restart the API server. Migration
   005 creates the registry and synchronization state without reseeding content.
5. Open **Video Testimonials** in the authenticated admin panel (by default,
   `/manage-portal/videos`) and choose **Synchronize channel**.

The fixed channel is `https://www.youtube.com/@g3beducation_nerul/shorts`.
The server resolves that handle through `channels.list`, retrieves its uploads
playlist, follows every `playlistItems.list` page, deduplicates video IDs, and
fetches `videos.list` metadata in batches of at most 50. It checks every imported
video's `snippet.channelId` against the resolved channel ID.

## Distinguish Shorts from other uploads

The public API exposes no authoritative `isShort` field. Duration, a `#shorts`
title/tag, a Shorts-shaped URL, or thumbnail dimensions alone do not establish
that a video appears in the channel's Shorts tab.

Without a curated playlist, non-live uploads up to 180 seconds enter the review
registry. An editor must check each candidate on the channel and confirm that it
is a Short before publishing it. Parent/student categories are assigned by the
editor; synchronization does not guess them.

For automatic publication of future Shorts, maintain a public or unlisted
playlist containing **only verified Shorts from this channel**, and set its ID
as `YOUTUBE_SHORTS_PLAYLIST_ID` on the backend. Add future Shorts to that playlist
when publishing them. Playlist membership supplies the explicit Shorts
classification; the integration still independently verifies the video channel,
duration, availability and embedding permission. Videos from other channels are
never published through this registry.

Without an API key, administrators can save syntactically valid YouTube URLs in
the registry. They stay pending and unpublished until the official API verifies
their channel. This is an editable maintained list, not a claim of live channel
verification. Existing testimonial title/category/visibility/order controls
continue working without API access.

Official references: [videos resource](https://developers.google.com/youtube/data/reference/rest/v3/videos),
[uploaded-video retrieval](https://developers.google.com/youtube/data/guides/implementation/videos),
[YouTube Shorts eligibility](https://support.google.com/youtube/answer/15424877).

## Scheduling, quota and failures

Backend settings and their defaults:

| Setting | Default | Purpose |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | empty | Required for API verification and import |
| `YOUTUBE_SHORTS_PLAYLIST_ID` | empty | Optional explicitly curated Shorts playlist |
| `YOUTUBE_AUTO_SYNC` | `true` | Enable the running server's refresh scheduler |
| `YOUTUBE_SYNC_INTERVAL_MINUTES` | `360` | Time between refresh attempts |
| `YOUTUBE_SYNC_MAX_PAGES` | `500` | Safety limit per playlist; exceeding it fails the sync |
| `YOUTUBE_REQUEST_TIMEOUT_MS` | `12000` | Timeout for an individual API request |
| `YOUTUBE_SYNC_MAX_MS` | `120000` | Overall API import time budget |

The timer runs while the API process is running. A database lease prevents two
server instances from synchronizing simultaneously. Manual synchronization uses
the same code and lock. API metadata is refreshed or removed within 30 days;
stale managed records are not shown in the public carousel.

Each `channels.list`, `playlistItems.list` page and `videos.list` batch currently
costs one quota unit. A refresh therefore uses one channel request plus the
number of playlist pages and metadata batches, with additional calls on retry.
The implementation does not use `search.list`. Check the project's actual quota
and the current [official quota table](https://developers.google.com/youtube/data/determine_quota_cost)
before choosing a higher refresh frequency.

Missing configuration, quota exhaustion, timeouts, repeated pagination tokens,
or page/time limits produce an admin-visible error. They do not publish a
partial snapshot or erase the last successful list. Removed/private videos and
embedding-disabled videos are suppressed after a successful metadata check.
Exclusions survive future imports, and editor-assigned categories and ordering
are retained.

## Administration and public playback

Admin/editor authorization and CSRF protect `/api/admin/youtube-shorts` and its
`/status`, `/sync` and record endpoints. The registry supports manual URL
registration, Shorts confirmation, categories, title edits, exclusions, search
and pagination. The existing catalog controls visibility and order. API keys
are absent from public responses and status payloads.

The public carousel preserves **All**, **What Parents Say**, and **Student
Review** filters. Arrows wrap through every video; keyboard Arrow/Home/End keys
and a selector make large lists accessible. Only the selected video can mount
an iframe, and the official IFrame API is loaded only after a visitor requests
playback. Autoplay is disabled. Controls and captions sit outside the embedded
player. The frame is 16:9 with a 200-pixel minimum height on narrow screens.

Documented player errors show retry feedback and a direct YouTube watch link.
Thumbnail failures use a neutral video icon. See the [IFrame API reference](https://developers.google.com/youtube/iframe_api_reference)
and [embed requirements](https://developers.google.com/youtube/terms/required-minimum-functionality).

## Verification

```bash
npm test --prefix server
npm test --prefix client
npm run build
```

The tests cover paginated provider responses using controlled fixtures,
duplicate IDs, unavailable/cross-channel records, missing configuration, errors,
registry permissions, player lifecycle, navigation, filters and fallbacks.
Mocked API/player tests are not evidence of a live channel import or successful
YouTube playback. Those checks require configured API access and a working
browser connection.
