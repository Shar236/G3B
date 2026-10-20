import { query, queryOne, withTransaction } from '../config/db.js';
import { parseVideoUrl } from '../utils/contentUrls.js';
import ApiError from '../utils/ApiError.js';

const toCamel = (key) => key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
const toSnake = (key) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);

const BOOLEAN_FIELDS = new Set(['isActive']);
const NUMBER_FIELDS = new Set(['id', 'sortOrder', 'rating', 'stepNumber', 'serviceId', 'destinationId']);

/** Convert a database row into the camelCase shape exposed by the API. */
export function mapRow(row) {
  const output = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = toCamel(key);
    if (BOOLEAN_FIELDS.has(camelKey)) {
      output[camelKey] = Boolean(value);
    } else if (NUMBER_FIELDS.has(camelKey) && value !== null) {
      output[camelKey] = Number(value);
    } else {
      output[camelKey] = value;
    }
  }
  return output;
}

/**
 * Build a small CRUD helper for the simple content tables so the ~10 similar
 * resources do not each need duplicated SQL.
 */
function createSimpleResource(table, columns, { orderBy = 'sort_order ASC, id ASC' } = {}) {
  const columnSet = new Set(columns);

  const pick = (payload) => {
    const values = {};
    for (const [key, value] of Object.entries(payload)) {
      const column = toSnake(key);
      if (columnSet.has(column) && value !== undefined) {
        values[column] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
      }
    }
    return values;
  };

  return {
    async list({ activeOnly = false } = {}) {
      const sql = `SELECT * FROM ${table}${activeOnly ? ' WHERE is_active = 1' : ''} ORDER BY ${orderBy}`;
      const rows = await query(sql);
      return rows.map(mapRow);
    },

    async findById(id) {
      const row = await queryOne(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
      return row ? mapRow(row) : null;
    },

    async create(payload) {
      const values = pick(payload);
      if (Object.keys(values).length === 0) values[columns[0]] = '';
      const keys = Object.keys(values);
      const placeholders = keys.map(() => '?').join(', ');
      const result = await query(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
        Object.values(values),
      );
      return this.findById(result.insertId);
    },

    async update(id, payload) {
      const values = pick(payload);
      const keys = Object.keys(values);
      if (keys.length === 0) return this.findById(id);

      const assignments = keys.map((key) => `${key} = ?`).join(', ');
      await query(`UPDATE ${table} SET ${assignments} WHERE id = ?`, [...Object.values(values), id]);
      return this.findById(id);
    },

    async remove(id) {
      const result = await query(`DELETE FROM ${table} WHERE id = ?`, [id]);
      return result.affectedRows > 0;
    },

    async reorder(orderedIds) {
      await withTransaction(async (connection) => {
        for (const [index, id] of orderedIds.entries()) {
          await connection.execute(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [index, id]);
        }
      });
      return this.list();
    },
  };
}

function parseJsonSafe(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function stringifyJsonSafe(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

// ---------------------------------------------------------------------------
// Services (with feature bullet points, coaching packages, FAQs and pricing)
// ---------------------------------------------------------------------------
export const servicesRepository = {
  async list({ activeOnly = false } = {}) {
    const rows = await query(
      `SELECT * FROM services${activeOnly ? ' WHERE is_active = 1' : ''} ORDER BY sort_order ASC, id ASC`,
    );
    const features = await query('SELECT * FROM service_features ORDER BY sort_order ASC, id ASC');

    return rows.map((row) => ({
      ...mapRow(row),
      packages: parseJsonSafe(row.packages_json, []),
      pricing: parseJsonSafe(row.pricing_json, []),
      trainers: parseJsonSafe(row.trainers_json, []),
      faqs: parseJsonSafe(row.faqs_json, []),
      features: features.filter((feature) => feature.service_id === row.id).map((feature) => feature.text),
    }));
  },

  async findById(id) {
    const row = await queryOne('SELECT * FROM services WHERE id = ? LIMIT 1', [id]);
    if (!row) return null;
    const features = await query(
      'SELECT text FROM service_features WHERE service_id = ? ORDER BY sort_order ASC, id ASC',
      [id],
    );
    return {
      ...mapRow(row),
      packages: parseJsonSafe(row.packages_json, []),
      pricing: parseJsonSafe(row.pricing_json, []),
      trainers: parseJsonSafe(row.trainers_json, []),
      faqs: parseJsonSafe(row.faqs_json, []),
      features: features.map((feature) => feature.text),
    };
  },

  async create(payload) {
    const { features = [], packages, pricing, trainers, faqs, ...service } = payload;
    return withTransaction(async (connection) => {
      const [result] = await connection.execute(
        `INSERT INTO services (
           title, slug, subtitle, badge, icon, description, 
           packages_json, pricing_json, trainers_json, faqs_json, cta_label, 
           image_url, sort_order, is_active
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          service.title,
          service.slug ?? null,
          service.subtitle ?? null,
          service.badge ?? null,
          service.icon ?? 'fas fa-graduation-cap',
          service.description ?? null,
          stringifyJsonSafe(packages ?? service.packagesJson),
          stringifyJsonSafe(pricing ?? service.pricingJson),
          stringifyJsonSafe(trainers ?? service.trainersJson),
          stringifyJsonSafe(faqs ?? service.faqsJson),
          service.ctaLabel ?? 'Book Counselling for this Service',
          service.imageUrl ?? null,
          service.sortOrder ?? 0,
          service.isActive === false ? 0 : 1,
        ],
      );
      for (const [index, text] of features.entries()) {
        await connection.execute('INSERT INTO service_features (service_id, text, sort_order) VALUES (?, ?, ?)', [
          result.insertId,
          text,
          index,
        ]);
      }
      return result.insertId;
    }).then((id) => this.findById(id));
  },

  async update(id, payload) {
    const { features, packages, pricing, trainers, faqs, ...service } = payload;
    await withTransaction(async (connection) => {
      const assignments = [];
      const values = [];
      const map = {
        title: service.title,
        slug: service.slug,
        subtitle: service.subtitle,
        badge: service.badge,
        icon: service.icon,
        description: service.description,
        packages_json: packages !== undefined ? stringifyJsonSafe(packages) : (service.packagesJson !== undefined ? stringifyJsonSafe(service.packagesJson) : undefined),
        pricing_json: pricing !== undefined ? stringifyJsonSafe(pricing) : (service.pricingJson !== undefined ? stringifyJsonSafe(service.pricingJson) : undefined),
        trainers_json: trainers !== undefined ? stringifyJsonSafe(trainers) : (service.trainersJson !== undefined ? stringifyJsonSafe(service.trainersJson) : undefined),
        faqs_json: faqs !== undefined ? stringifyJsonSafe(faqs) : (service.faqsJson !== undefined ? stringifyJsonSafe(service.faqsJson) : undefined),
        cta_label: service.ctaLabel,
        image_url: service.imageUrl,
        sort_order: service.sortOrder,
        is_active: service.isActive === undefined ? undefined : service.isActive ? 1 : 0,
      };
      for (const [column, value] of Object.entries(map)) {
        if (value !== undefined) {
          assignments.push(`${column} = ?`);
          values.push(value);
        }
      }
      if (assignments.length > 0) {
        await connection.execute(`UPDATE services SET ${assignments.join(', ')} WHERE id = ?`, [...values, id]);
      }
      if (Array.isArray(features)) {
        await connection.execute('DELETE FROM service_features WHERE service_id = ?', [id]);
        for (const [index, text] of features.entries()) {
          await connection.execute(
            'INSERT INTO service_features (service_id, text, sort_order) VALUES (?, ?, ?)',
            [id, text, index],
          );
        }
      }
    });
    return this.findById(id);
  },

  async remove(id) {
    const result = await query('DELETE FROM services WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async reorder(orderedIds) {
    await withTransaction(async (connection) => {
      for (const [index, id] of orderedIds.entries()) {
        await connection.execute('UPDATE services SET sort_order = ? WHERE id = ?', [index, id]);
      }
    });
    return this.list();
  },
};

// ---------------------------------------------------------------------------
// Destinations (with bullet points and metrics)
// ---------------------------------------------------------------------------
export const destinationsRepository = {
  async list({ activeOnly = false } = {}) {
    const rows = await query(
      `SELECT * FROM destinations${activeOnly ? ' WHERE is_active = 1' : ''} ORDER BY sort_order ASC, id ASC`,
    );
    const points = await query('SELECT * FROM destination_points ORDER BY sort_order ASC, id ASC');

    return rows.map((row) => ({
      ...mapRow(row),
      points: points.filter((point) => point.destination_id === row.id).map((point) => point.text),
    }));
  },

  async findById(id) {
    const row = await queryOne('SELECT * FROM destinations WHERE id = ? LIMIT 1', [id]);
    if (!row) return null;
    const points = await query(
      'SELECT text FROM destination_points WHERE destination_id = ? ORDER BY sort_order ASC, id ASC',
      [id],
    );
    return { ...mapRow(row), points: points.map((point) => point.text) };
  },

  async create(payload) {
    const { points = [], ...destination } = payload;
    return withTransaction(async (connection) => {
      const [result] = await connection.execute(
        `INSERT INTO destinations (
           country, flag_icon, description, stay_back_time, work_rights, 
           detail_link, currency_symbol, avg_tuition, image_url, sort_order, is_active
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          destination.country,
          destination.flagIcon ?? null,
          destination.description ?? null,
          destination.stayBackTime ?? null,
          destination.workRights ?? null,
          destination.detailLink ?? null,
          destination.currencySymbol ?? null,
          destination.avgTuition ?? null,
          destination.imageUrl ?? null,
          destination.sortOrder ?? 0,
          destination.isActive === false ? 0 : 1,
        ],
      );
      for (const [index, text] of points.entries()) {
        await connection.execute(
          'INSERT INTO destination_points (destination_id, text, sort_order) VALUES (?, ?, ?)',
          [result.insertId, text, index],
        );
      }
      return result.insertId;
    }).then((id) => this.findById(id));
  },

  async update(id, payload) {
    const { points, ...destination } = payload;
    await withTransaction(async (connection) => {
      const assignments = [];
      const values = [];
      const map = {
        country: destination.country,
        flag_icon: destination.flagIcon,
        description: destination.description,
        stay_back_time: destination.stayBackTime,
        work_rights: destination.workRights,
        detail_link: destination.detailLink,
        currency_symbol: destination.currencySymbol,
        avg_tuition: destination.avgTuition,
        image_url: destination.imageUrl,
        sort_order: destination.sortOrder,
        is_active: destination.isActive === undefined ? undefined : destination.isActive ? 1 : 0,
      };
      for (const [column, value] of Object.entries(map)) {
        if (value !== undefined) {
          assignments.push(`${column} = ?`);
          values.push(value);
        }
      }
      if (assignments.length > 0) {
        await connection.execute(`UPDATE destinations SET ${assignments.join(', ')} WHERE id = ?`, [...values, id]);
      }
      if (Array.isArray(points)) {
        await connection.execute('DELETE FROM destination_points WHERE destination_id = ?', [id]);
        for (const [index, text] of points.entries()) {
          await connection.execute(
            'INSERT INTO destination_points (destination_id, text, sort_order) VALUES (?, ?, ?)',
            [id, text, index],
          );
        }
      }
    });
    return this.findById(id);
  },

  async remove(id) {
    const result = await query('DELETE FROM destinations WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async reorder(orderedIds) {
    await withTransaction(async (connection) => {
      for (const [index, id] of orderedIds.entries()) {
        await connection.execute('UPDATE destinations SET sort_order = ? WHERE id = ?', [index, id]);
      }
    });
    return this.list();
  },
};

// ---------------------------------------------------------------------------
// Simple content resources
// ---------------------------------------------------------------------------
export const galleryRepository = createSimpleResource(
  'gallery_images',
  ['alt_text', 'caption', 'category', 'image_url', 'sort_order', 'is_active'],
);

export const testimonialsRepository = createSimpleResource('testimonials', [
  'author_name',
  'author_role',
  'avatar_text',
  'content',
  'rating',
  'source',
  'source_url',
  'posted_label',
  'sort_order',
  'is_active',
]);

const videoCrud = createSimpleResource('video_testimonials', [
  'title',
  'category',
  'student_name',
  'destination_country',
  'youtube_id',
  'youtube_url',
  'orientation',
  'sort_order',
  'is_active',
]);

export const videosRepository = {
  ...videoCrud,
  async list({ activeOnly = false } = {}) {
    // Gate every legacy duplicate by provider/ID, including exclusion tombstones
    // whose original linked row has been removed. Vimeo IDs remain independent.
    const rows = await query(`SELECT v.*, r.thumbnail_url, r.availability FROM video_testimonials v LEFT JOIN youtube_short_registry r ON r.youtube_id = v.youtube_id AND v.youtube_url NOT REGEXP '^https?://(www[.]|player[.])?vimeo[.]com([/:])' ${activeOnly ? "WHERE v.is_active = 1 AND (r.id IS NULL OR (r.excluded = 0 AND (r.verification_source = 'admin' OR (r.channel_verified = 1 AND r.verified_short = 1 AND r.availability = 'available' AND r.last_checked_at > UTC_TIMESTAMP() - INTERVAL 30 DAY))))" : ''} ORDER BY v.sort_order ASC, v.id ASC`);

    // Existing duplicate records remain editable; public carousels receive one ID.
    const seen = new Set();
    return rows.map(mapRow).filter((row) => {
      if (!activeOnly) return true;
      const provider = parseVideoUrl(row.youtubeUrl)?.provider || 'unknown';
      const key = `${provider}:${row.youtubeId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
  async update(id, payload) {
    const existing = await this.findById(id);
    if (!existing) return null;
    // Identity changes cannot bypass the channel-verifying Shorts registry.
    const next = parseVideoUrl(payload.youtubeUrl ?? existing.youtubeUrl);
    const previous = parseVideoUrl(existing.youtubeUrl);
    if ((next?.provider === 'youtube' || previous?.provider === 'youtube') && (next?.id !== previous?.id || next?.provider !== previous?.provider || (payload.youtubeId !== undefined && payload.youtubeId !== existing.youtubeId))) throw ApiError.badRequest('Add new YouTube identities through the verified Shorts registry.');
    const updated = await videoCrud.update.call(this, id, payload);
    if (payload.title !== undefined) await query('UPDATE youtube_short_registry SET title = ?, title_overridden = 1 WHERE video_id = ?', [payload.title, id]);
    return updated;
  },
  async remove(id) {
    return withTransaction(async (connection) => {
      const [rows] = await connection.execute('SELECT * FROM video_testimonials WHERE id = ? FOR UPDATE', [id]);
      const row = rows[0];
      if (!row) return false;
      if (parseVideoUrl(row.youtube_url)?.provider === 'youtube') {
        await connection.execute(`INSERT INTO youtube_short_registry (youtube_id, source_url, excluded) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE excluded = 1, video_id = NULL`, [row.youtube_id, row.youtube_url]);
      }
      await connection.execute('DELETE FROM video_testimonials WHERE id = ?', [id]);
      return true;
    });
  },
};

export const processStepsRepository = createSimpleResource('process_steps', [
  'step_number',
  'title',
  'description',
  'badge',
  'icon',
  'sort_order',
  'is_active',
]);

export const statsRepository = createSimpleResource('stats', ['value', 'label', 'sort_order', 'is_active']);

export const whyFeaturesRepository = createSimpleResource('why_features', ['icon', 'text', 'sort_order', 'is_active']);

export const certificationsRepository = createSimpleResource('certifications', [
  'alt_text',
  'image_url',
  'full_url',
  'sort_order',
  'is_active',
]);

export const enquiryOptionsRepository = createSimpleResource('enquiry_options', ['label', 'sort_order', 'is_active']);

export const socialLinksRepository = createSimpleResource('social_links', [
  'platform',
  'url',
  'icon',
  'sort_order',
  'is_active',
]);

export const navigationItemsRepository = createSimpleResource('navigation_items', [
  'label',
  'url',
  'sort_order',
  'is_active',
  'open_new_tab',
  'is_button',
]);

/** Standalone FAQs, optionally scoped to a page. */
export const faqsRepository = createSimpleResource('faqs', [
  'question',
  'answer',
  'category',
  'page_id',
  'sort_order',
  'is_active',
]);

export default {
  servicesRepository,
  destinationsRepository,
  galleryRepository,
  testimonialsRepository,
  videosRepository,
  processStepsRepository,
  statsRepository,
  whyFeaturesRepository,
  certificationsRepository,
  enquiryOptionsRepository,
  socialLinksRepository,
  navigationItemsRepository,
  faqsRepository,
};
