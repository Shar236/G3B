import { query, queryOne, withTransaction } from '../config/db.js';
import { mapRow } from './catalogRepository.js';
import ApiError from '../utils/ApiError.js';

const json = (value) => typeof value === 'string' ? JSON.parse(value) : value;
const map = (row) => row ? { ...mapRow(row), channelVerified: Boolean(row.channel_verified), verifiedShort: Boolean(row.verified_short), excluded: Boolean(row.excluded), titleOverridden: Boolean(row.title_overridden), videoId: row.video_id === null ? null : Number(row.video_id), isActive: Boolean(row.is_active), sortOrder: row.sort_order !== null && row.sort_order !== undefined ? Number(row.sort_order) : 0, orientation: row.orientation || 'portrait' } : null;
const select = `SELECT r.*, COALESCE(v.title, r.title) AS title, COALESCE(v.category, '') AS category, COALESCE(v.is_active, 0) AS is_active, v.sort_order, v.orientation FROM youtube_short_registry r LEFT JOIN video_testimonials v ON v.id = r.video_id`;

/** Link an approved, available entry without overriding editors' titles/order. */
async function publish(connection, row, updates = {}) {
  const canPublish = Boolean(row.channel_verified) && Boolean(row.verified_short) && !row.excluded && row.availability === 'available';
  if (!canPublish) return;
  if (!row.video_id) {
    // Link a pre-existing YouTube testimonial rather than creating a duplicate.
    const [existing] = await connection.execute("SELECT id, title FROM video_testimonials WHERE youtube_id = ? AND youtube_url NOT REGEXP '^https?://(www[.]|player[.])?vimeo[.]com([/:])' ORDER BY id LIMIT 1 FOR UPDATE", [row.youtube_id]);
    if (existing.length) {
      row.video_id = existing[0].id;
      // First synchronization must treat the existing catalogue title as editor
      // content, just like its category, ordering and enabled preference.
      row.title = updates.title ?? existing[0].title;
      row.title_overridden = 1;
    } else {
      const [orderRows] = await connection.execute('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM video_testimonials');
      const sortOrder = updates.sortOrder !== undefined ? Number(updates.sortOrder) : orderRows[0].next_order;
      const [result] = await connection.execute(`INSERT INTO video_testimonials (title, category, youtube_id, youtube_url, orientation, sort_order, is_active) VALUES (?, ?, ?, ?, 'portrait', ?, ?)`, [updates.title || row.title, updates.category || '', row.youtube_id, row.source_url, sortOrder, updates.isActive === false ? 0 : 1]);
      row.video_id = result.insertId;
    }
    await connection.execute('UPDATE youtube_short_registry SET video_id = ?, title = ?, title_overridden = ? WHERE id = ?', [row.video_id, row.title, row.title_overridden ? 1 : 0, row.id]);
  }
  const fields = [], values = [];
  for (const [name, column] of [['title', 'title'], ['category', 'category'], ['isActive', 'is_active'], ['sortOrder', 'sort_order']]) {
    if (updates[name] !== undefined) { fields.push(`${column} = ?`); values.push(name === 'isActive' ? Number(updates[name]) : updates[name]); }
  }
  if (fields.length) await connection.execute(`UPDATE video_testimonials SET ${fields.join(', ')} WHERE id = ?`, [...values, row.video_id]);
}

export const youtubeRepository = {
  async state() {
    const row = await queryOne('SELECT channel_id, uploads_playlist_id, last_attempt_at, last_success_at, last_error, last_result, lock_expires_at FROM youtube_sync_state WHERE id = 1');
    return row ? { ...mapRow(row), lastResult: json(row.last_result) } : {};
  },
  async counts() {
    const row = await queryOne(`SELECT COUNT(*) AS candidates, COALESCE(SUM(r.video_id IS NOT NULL AND r.excluded = 0 AND r.verified_short = 1 AND r.availability = 'available' AND v.is_active = 1 AND (r.verification_source = 'admin' OR r.last_checked_at > UTC_TIMESTAMP() - INTERVAL 30 DAY)), 0) AS published, COALESCE(SUM(r.verified_short = 0 AND r.excluded = 0), 0) AS pending, COALESCE(SUM(r.excluded = 1), 0) AS excluded, COALESCE(SUM(r.availability IN ('unavailable','embedding_disabled')), 0) AS unavailable FROM youtube_short_registry r LEFT JOIN video_testimonials v ON v.id = r.video_id`);
    return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key, Number(value)]));
  },
  async list() { return (await query(`${select} ORDER BY v.sort_order ASC, r.published_at DESC, r.id DESC`)).map(map); },
  async find(id) { return map(await queryOne(`${select} WHERE r.id = ?`, [id])); },
  async allIds() { return (await query('SELECT youtube_id FROM youtube_short_registry')).map((row) => row.youtube_id); },
  async acquireLock(seconds = 150) {
    const result = await query(`UPDATE youtube_sync_state SET lock_expires_at = UTC_TIMESTAMP() + INTERVAL ? SECOND, last_attempt_at = UTC_TIMESTAMP() WHERE id = 1 AND (lock_expires_at IS NULL OR lock_expires_at < UTC_TIMESTAMP())`, [seconds]);
    return result.affectedRows > 0;
  },
  async fail(message) { await query('UPDATE youtube_sync_state SET last_error = ?, last_attempt_at = UTC_TIMESTAMP(), lock_expires_at = NULL WHERE id = 1', [message.slice(0, 1000)]); },
  async register(video) {
    await query(`INSERT INTO youtube_short_registry (youtube_id, source_url, title, channel_id, channel_verified, duration_seconds, published_at, thumbnail_url, availability, last_checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE source_url = VALUES(source_url), title = IF(title_overridden = 1 OR VALUES(channel_verified) = 0, title, VALUES(title)), channel_id = IF(VALUES(channel_verified) = 1, VALUES(channel_id), channel_id), channel_verified = GREATEST(channel_verified, VALUES(channel_verified)), duration_seconds = IF(VALUES(channel_verified) = 1, VALUES(duration_seconds), duration_seconds), published_at = IF(VALUES(channel_verified) = 1, VALUES(published_at), published_at), thumbnail_url = IF(VALUES(channel_verified) = 1, VALUES(thumbnail_url), thumbnail_url), availability = IF(VALUES(channel_verified) = 1, VALUES(availability), availability), last_checked_at = IF(VALUES(channel_verified) = 1, VALUES(last_checked_at), last_checked_at)`, [video.youtubeId, video.sourceUrl, video.title || '', video.channelId || null, video.channelVerified ? 1 : 0, video.durationSeconds || null, video.publishedAt ? new Date(video.publishedAt) : null, video.thumbnailUrl || null, video.availability || 'pending', video.channelVerified ? new Date() : null]);
    return map(await queryOne(`${select} WHERE r.youtube_id = ?`, [video.youtubeId]));
  },
  async saveManual(data) {
    return await withTransaction(async (connection) => {
      const [existingVideos] = await connection.execute(
        'SELECT id, sort_order FROM video_testimonials WHERE youtube_id = ? ORDER BY id LIMIT 1 FOR UPDATE',
        [data.youtubeId]
      );

      let videoId;
      if (existingVideos.length > 0) {
        videoId = existingVideos[0].id;
        const sortOrder = data.sortOrder !== null && data.sortOrder !== undefined ? data.sortOrder : existingVideos[0].sort_order;
        await connection.execute(
          `UPDATE video_testimonials
           SET title = ?, category = ?, youtube_url = ?, orientation = ?, sort_order = ?, is_active = ?
           WHERE id = ?`,
          [data.title, data.category, data.sourceUrl, data.orientation, sortOrder, data.isActive, videoId]
        );
      } else {
        let sortOrder = data.sortOrder;
        if (sortOrder === null || sortOrder === undefined) {
          const [orderRows] = await connection.execute(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM video_testimonials'
          );
          sortOrder = orderRows[0].next_order;
        }
        const [result] = await connection.execute(
          `INSERT INTO video_testimonials
             (title, category, student_name, destination_country, youtube_id, youtube_url, orientation, sort_order, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [data.title, data.category, data.category, '', data.youtubeId, data.sourceUrl, data.orientation, sortOrder, data.isActive]
        );
        videoId = result.insertId;
      }

      await connection.execute(
        `INSERT INTO youtube_short_registry
           (youtube_id, source_url, title, channel_verified, verified_short, verification_source, title_overridden, thumbnail_url, availability, excluded, video_id, last_checked_at)
         VALUES (?, ?, ?, 1, 1, 'admin', 1, ?, 'available', 0, ?, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE
           source_url = VALUES(source_url),
           title = VALUES(title),
           channel_verified = 1,
           verified_short = 1,
           verification_source = 'admin',
           title_overridden = 1,
           thumbnail_url = VALUES(thumbnail_url),
           availability = 'available',
           excluded = 0,
           video_id = VALUES(video_id),
           last_checked_at = UTC_TIMESTAMP()`,
        [data.youtubeId, data.sourceUrl, data.title, data.thumbnailUrl, videoId]
      );

      const [registryRow] = await connection.execute(
        `${select} WHERE r.youtube_id = ?`,
        [data.youtubeId]
      );
      return map(registryRow[0]);
    });
  },
  async update(id, updates) {
    await withTransaction(async (connection) => {
      const [rows] = await connection.execute('SELECT * FROM youtube_short_registry WHERE id = ? FOR UPDATE', [id]);
      const row = rows[0];
      if (!row) throw ApiError.notFound('YouTube registry entry not found.');
      if (updates.verifiedShort === true && row.verification_source !== 'admin' && updates.verificationSource !== 'admin' && (!row.channel_verified || row.availability !== 'available' || !row.last_checked_at || Date.now() - new Date(row.last_checked_at).getTime() > 30 * 86400000)) throw ApiError.badRequest('Refresh and verify this video with the YouTube API before confirming it as a Short.');
      if (updates.excluded !== undefined) row.excluded = Number(updates.excluded);
      if (updates.verifiedShort !== undefined) { row.verified_short = Number(updates.verifiedShort); row.verification_source = updates.verificationSource || 'admin'; }
      if (updates.title !== undefined) { row.title = updates.title; row.title_overridden = 1; }
      // Keep the linked catalogue row while hidden, preserving editors' category,
      // enabled preference and ordering if they later restore or confirm it.
      await connection.execute('UPDATE youtube_short_registry SET excluded = ?, verified_short = ?, verification_source = ?, title = ?, title_overridden = IF(?, 1, title_overridden), video_id = ? WHERE id = ?', [row.excluded, row.verified_short, row.verification_source, row.title, updates.title !== undefined ? 1 : 0, row.video_id, id]);
      await publish(connection, row, updates);
    });
    return this.find(id);
  },
  /** No partial snapshot commit if any API page or metadata batch fails. */
  async commit({ entries, channelId, uploadsPlaylistId, result }) {
    await withTransaction(async (connection) => {
      const availableIds = entries.map((entry) => entry.youtubeId);
      if (availableIds.length) {
        await connection.query('UPDATE youtube_short_registry SET availability = \'unavailable\', last_checked_at = UTC_TIMESTAMP() WHERE youtube_id NOT IN (?) AND verification_source != \'admin\'', [availableIds]);
      } else await connection.execute("UPDATE youtube_short_registry SET availability = 'unavailable', last_checked_at = UTC_TIMESTAMP() WHERE verification_source != 'admin'");
      for (const entry of entries) {
        await connection.execute(`INSERT INTO youtube_short_registry (youtube_id, source_url, title, channel_id, channel_verified, verified_short, verification_source, duration_seconds, published_at, thumbnail_url, availability, last_checked_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE title = IF(title_overridden = 1, title, VALUES(title)), channel_id = VALUES(channel_id), channel_verified = 1, verified_short = IF(verification_source = 'admin', verified_short, VALUES(verified_short)), verification_source = IF(verification_source = 'admin', verification_source, VALUES(verification_source)), duration_seconds = VALUES(duration_seconds), published_at = VALUES(published_at), thumbnail_url = VALUES(thumbnail_url), availability = VALUES(availability), last_checked_at = UTC_TIMESTAMP()`, [entry.youtubeId, entry.sourceUrl, entry.title, channelId, Number(entry.verifiedShort), entry.verificationSource, entry.durationSeconds, entry.publishedAt ? new Date(entry.publishedAt) : null, entry.thumbnailUrl, entry.availability]);
        const [rows] = await connection.execute('SELECT * FROM youtube_short_registry WHERE youtube_id = ? FOR UPDATE', [entry.youtubeId]);
        const row = rows[0];
        await publish(connection, row);
        if (row.video_id && !row.title_overridden) await connection.execute('UPDATE video_testimonials SET title = ? WHERE id = ?', [entry.title, row.video_id]);
      }
      await connection.execute('UPDATE youtube_sync_state SET channel_id = ?, uploads_playlist_id = ?, last_success_at = UTC_TIMESTAMP(), last_error = NULL, last_result = ?, lock_expires_at = NULL WHERE id = 1', [channelId, uploadsPlaylistId, JSON.stringify(result)]);
    });
  },
  /** Developer Policies III.E.4: refresh or remove cached API data after 30 days.
   * URLs, IDs, exclusions, and explicit editor titles remain admin registry data. */
  async expireMetadata() {
    await withTransaction(async (connection) => {
      await connection.execute("UPDATE video_testimonials v JOIN youtube_short_registry r ON r.video_id = v.id SET v.title = 'G3B Education video' WHERE r.last_checked_at < UTC_TIMESTAMP() - INTERVAL 30 DAY AND r.title_overridden = 0 AND r.verification_source != 'admin'");
      await connection.execute("UPDATE youtube_short_registry SET title = IF(title_overridden = 1, title, ''), thumbnail_url = NULL, duration_seconds = NULL, published_at = NULL, availability = 'pending', channel_id = NULL, channel_verified = 0 WHERE last_checked_at < UTC_TIMESTAMP() - INTERVAL 30 DAY AND verification_source != 'admin'");
      await connection.execute('UPDATE youtube_sync_state SET channel_id = NULL, uploads_playlist_id = NULL, last_result = NULL WHERE last_success_at < UTC_TIMESTAMP() - INTERVAL 30 DAY');
    });
  },
};

export default youtubeRepository;
