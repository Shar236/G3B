import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

export async function syncExistingVideosToRegistry() {
  const [existing] = await pool.execute(`
    INSERT INTO youtube_short_registry
      (youtube_id, source_url, title, channel_verified, verified_short, verification_source, title_overridden, thumbnail_url, availability, excluded, video_id, last_checked_at)
    SELECT
      v.youtube_id,
      v.youtube_url,
      v.title,
      1,
      1,
      'admin',
      1,
      CONCAT('https://i.ytimg.com/vi/', v.youtube_id, '/hqdefault.jpg'),
      'available',
      0,
      v.id,
      UTC_TIMESTAMP()
    FROM video_testimonials v
    WHERE v.youtube_id IS NOT NULL AND v.youtube_id != ''
    ON DUPLICATE KEY UPDATE
      video_id = VALUES(video_id),
      source_url = VALUES(source_url),
      channel_verified = 1,
      verified_short = 1,
      availability = 'available'
  `);
  return existing;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  syncExistingVideosToRegistry()
    .then(() => {
      console.log('Successfully synced existing videos to registry.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error syncing:', err);
      process.exit(1);
    });
}
