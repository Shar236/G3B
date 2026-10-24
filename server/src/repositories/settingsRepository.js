import { query, queryOne, withTransaction } from '../config/db.js';

// Public settings are allowlisted so a newly introduced integration credential
// cannot accidentally become part of the anonymous homepage response.
export const PUBLIC_SETTING_KEYS = new Set([
  'brand_name', 'header_logo_url', 'header_subheading', 'header_cta_label', 'header_cta_url',
  'footer_copyright', 'footer_tagline', 'footer_about', 'hero_badge', 'hero_bg_image_url',
  'hero_cta_career_label', 'hero_cta_career_url', 'hero_cta_services_label', 'hero_cta_services_url',
  'founder_name', 'founder_role', 'founder_image_url', 'founder_image_alt', 'founder_credentials_text',
  'certifications_heading', 'contact_office_heading', 'contact_address', 'contact_phone', 'contact_phone_link',
  'contact_email', 'working_hours', 'google_review_url', 'google_rating', 'google_review_count', 'show_google_reviews',
  'career_mentor_url', 'seo_title', 'seo_description', 'seo_keywords', 'favicon_url',
  'og_image_url', 'og_title', 'og_description', 'tracking_code_head', 'tracking_code_body',
  'services_hero_heading', 'services_hero_subheading',
]);

export function publicSettings(settings) {
  return Object.fromEntries(Object.entries(settings).filter(([key]) => PUBLIC_SETTING_KEYS.has(key)));
}

/** Content blocks (editable headings, descriptions and CTA labels). */
export const contentBlocksRepository = {
  async all() {
    const rows = await query('SELECT * FROM content_blocks ORDER BY block_key ASC');
    const map = {};
    for (const row of rows) {
      map[row.block_key] = {
        key: row.block_key,
        heading: row.heading,
        subheading: row.subheading,
        body: row.body,
        ctaLabel: row.cta_label,
        ctaUrl: row.cta_url,
        updatedAt: row.updated_at,
      };
    }
    return map;
  },

  async upsert(blockKey, payload) {
    await query(
      `INSERT INTO content_blocks (block_key, heading, subheading, body, cta_label, cta_url)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (block_key) DO UPDATE SET
         heading = EXCLUDED.heading,
         subheading = EXCLUDED.subheading,
         body = EXCLUDED.body,
         cta_label = EXCLUDED.cta_label,
         cta_url = EXCLUDED.cta_url`,
      [
        blockKey,
        payload.heading ?? null,
        payload.subheading ?? null,
        payload.body ?? null,
        payload.ctaLabel ?? null,
        payload.ctaUrl ?? null,
      ],
    );
    const row = await queryOne('SELECT * FROM content_blocks WHERE block_key = ? LIMIT 1', [blockKey]);
    return row;
  },
};

/** Key/value site settings grouped by area (contact, reviews, seo, homepage...). */
export const settingsRepository = {
  async public() { return publicSettings(await this.all()); },
  async all() {
    const rows = await query('SELECT * FROM site_settings ORDER BY setting_group ASC, setting_key ASC');
    const map = {};
    for (const row of rows) {
      map[row.setting_key] = row.setting_value;
    }
    return map;
  },

  async grouped() {
    const rows = await query('SELECT * FROM site_settings ORDER BY setting_group ASC, setting_key ASC');
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.setting_group]) grouped[row.setting_group] = [];
      grouped[row.setting_group].push({
        key: row.setting_key,
        value: row.setting_value,
        group: row.setting_group,
        updatedAt: row.updated_at,
      });
    }
    return grouped;
  },

  /** Upsert a map of { setting_key: value }. */
  async upsertMany(entries) {
    await withTransaction(async (connection) => {
      for (const [key, value] of Object.entries(entries)) {
        await connection.execute(
          `INSERT INTO site_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
          [key, value === null || value === undefined ? null : String(value)],
        );
      }
    });
    return this.all();
  },

  async remove(key) {
    const result = await query('DELETE FROM site_settings WHERE setting_key = ?', [key]);
    return result.affectedRows > 0;
  },
};

export default { contentBlocksRepository, settingsRepository };
