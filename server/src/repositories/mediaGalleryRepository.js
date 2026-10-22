import { query, queryOne, withTransaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';

const toCamel = (key) => key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
const toSnake = (key) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);

const BOOLEAN_FIELDS = new Set(['isFeatured', 'isActive']);
const NUMBER_FIELDS = new Set(['id', 'sortOrder', 'createdBy']);

export function mapMediaRow(row) {
  if (!row) return null;
  const output = { ...row };
  for (const [key, value] of Object.entries(row)) {
    const camelKey = toCamel(key);
    let val = value;
    if (BOOLEAN_FIELDS.has(camelKey)) {
      val = Boolean(value);
    } else if (NUMBER_FIELDS.has(camelKey) && value !== null) {
      val = Number(value);
    }
    output[camelKey] = val;
    output[key] = val;
  }
  if (output.category && !output.category_name) {
    output.category_name = output.category;
    output.categoryName = output.category;
  }
  return output;
}

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);

export const mediaGalleryRepository = {
  async list({
    type,
    category,
    status = 'published',
    search,
    featured,
    page = 1,
    perPage = 24,
    sort = 'order',
  } = {}) {
    const conditions = [];
    const params = [];

    if (type && type !== 'all') {
      conditions.push('media_type = ?');
      params.push(type);
    }

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (category && category !== 'All' && category !== 'all' && category !== 'All Photos' && category !== 'All Videos') {
      conditions.push('category = ?');
      params.push(category);
    }

    if (featured !== undefined && featured !== null) {
      conditions.push('is_featured = ?');
      params.push(featured ? 1 : 0);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push('(title LIKE ? OR description LIKE ? OR caption LIKE ? OR alt_text LIKE ? OR category LIKE ?)');
      params.push(term, term, term, term, term);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM media_items ${whereClause}`;
    const [countResult] = await query(countSql, params);
    const total = Number(countResult?.total || 0);

    let orderBy = 'sort_order ASC, id DESC';
    if (sort === 'newest') orderBy = 'created_at DESC, id DESC';
    if (sort === 'oldest') orderBy = 'created_at ASC, id ASC';
    if (sort === 'title') orderBy = 'title ASC';

    const safePerPage = Math.max(1, Math.min(Number(perPage) || 24, 100));
    const safePage = Math.max(1, Number(page) || 1);
    const offset = (safePage - 1) * safePerPage;

    const itemsSql = `SELECT * FROM media_items ${whereClause} ORDER BY ${orderBy} LIMIT ${safePerPage} OFFSET ${offset}`;
    const rows = await query(itemsSql, params);

    return {
      items: rows.map(mapMediaRow),
      pagination: {
        page: safePage,
        perPage: safePerPage,
        total,
        totalPages: Math.ceil(total / safePerPage) || 1,
      },
    };
  },

  async getById(id) {
    const row = await queryOne('SELECT * FROM media_items WHERE id = ?', [id]);
    return mapMediaRow(row);
  },

  async getBySlug(slug) {
    const row = await queryOne('SELECT * FROM media_items WHERE slug = ?', [slug]);
    return mapMediaRow(row);
  },

  async getFeatured({ type, limit = 6 } = {}) {
    const conditions = ["status = 'published'", 'is_featured = 1'];
    const params = [];
    if (type && type !== 'all') {
      conditions.push('media_type = ?');
      params.push(type);
    }
    const sql = `SELECT * FROM media_items WHERE ${conditions.join(' AND ')} ORDER BY sort_order ASC, id DESC LIMIT ${Number(limit) || 6}`;
    const rows = await query(sql, params);
    return rows.map(mapMediaRow);
  },

  async create(data) {
    const slug = slugify(data.slug || data.title);
    const fields = {
      media_type: data.mediaType || 'photo',
      title: data.title,
      slug: slug || null,
      description: data.description || null,
      caption: data.caption || null,
      alt_text: data.altText || data.title,
      category: data.category || (data.mediaType === 'video' ? 'Student Experiences' : 'Events & Activities'),
      storage_provider: data.storageProvider || 'local',
      storage_key: data.storageKey || null,
      media_url: data.mediaUrl,
      thumbnail_url: data.thumbnailUrl || null,
      external_video_url: data.externalVideoUrl || null,
      duration: data.duration || null,
      is_featured: data.isFeatured ? 1 : 0,
      status: data.status || 'published',
      sort_order: Number(data.sortOrder) || 0,
      created_by: data.createdBy || null,
      published_at: data.status === 'published' ? new Date() : null,
    };

    const keys = Object.keys(fields);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(fields);

    const result = await query(
      `INSERT INTO media_items (${keys.join(', ')}) VALUES (${placeholders})`,
      values,
    );

    return this.getById(result.insertId);
  },

  async update(id, data) {
    const existing = await this.getById(id);
    if (!existing) return null;

    const allowed = [
      'mediaType',
      'title',
      'slug',
      'description',
      'caption',
      'altText',
      'category',
      'storageProvider',
      'storageKey',
      'mediaUrl',
      'thumbnailUrl',
      'externalVideoUrl',
      'duration',
      'isFeatured',
      'status',
      'sortOrder',
    ];

    const updates = [];
    const values = [];

    for (const key of allowed) {
      const snakeKey = toSnake(key);
      const incomingVal = data[key] !== undefined ? data[key] : data[snakeKey];
      if (incomingVal !== undefined) {
        const column = snakeKey;
        let val = incomingVal;
        if (key === 'isFeatured') val = (val === true || val === 1 || val === '1' || val === 'true') ? 1 : 0;
        if (key === 'slug') val = slugify(val || data.title || existing.title);
        updates.push(`${column} = ?`);
        values.push(val);
      }
    }

    if (data.status === 'published' && existing.status !== 'published') {
      updates.push('published_at = NOW()');
    }

    if (!updates.length) return existing;

    values.push(id);
    await query(`UPDATE media_items SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },

  async delete(id) {
    const existing = await this.getById(id);
    if (!existing) return false;
    await query('DELETE FROM media_items WHERE id = ?', [id]);
    return true;
  },

  async reorder(items = []) {
    return withTransaction(async (connection) => {
      for (const item of items) {
        if (item.id && item.sortOrder !== undefined) {
          await connection.execute('UPDATE media_items SET sort_order = ? WHERE id = ?', [
            Number(item.sortOrder),
            item.id,
          ]);
        }
      }
      return true;
    });
  },

  async getStats() {
    const [counts] = await query(`
      SELECT
        COUNT(CASE WHEN media_type = 'photo' AND status = 'published' THEN 1 END) AS published_photos,
        COUNT(CASE WHEN media_type = 'video' AND status = 'published' THEN 1 END) AS published_videos,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) AS draft_items,
        COUNT(CASE WHEN is_featured = 1 AND status = 'published' THEN 1 END) AS featured_items,
        COUNT(*) AS total_items
      FROM media_items
    `);

    const recent = await query(
      "SELECT id, media_type, title, category, media_url, thumbnail_url, is_featured, status, created_at FROM media_items ORDER BY created_at DESC LIMIT 6",
    );

    return {
      publishedPhotos: Number(counts?.published_photos || 0),
      publishedVideos: Number(counts?.published_videos || 0),
      draftItems: Number(counts?.draft_items || 0),
      featuredItems: Number(counts?.featured_items || 0),
      totalItems: Number(counts?.total_items || 0),
      recentMedia: recent.map(mapMediaRow),
    };
  },

  async getCategories(type = 'all') {
    let typeFilter = '';
    const params = [];
    if (type === 'photo') {
      typeFilter = "WHERE media_type IN ('photo', 'all') AND is_active = 1";
    } else if (type === 'video') {
      typeFilter = "WHERE media_type IN ('video', 'all') AND is_active = 1";
    } else {
      typeFilter = 'WHERE is_active = 1';
    }

    const categories = await query(
      `SELECT * FROM media_categories ${typeFilter} ORDER BY sort_order ASC, name ASC`,
    );

    // Get item counts per category for published items
    const countQuery = `
      SELECT category, media_type, COUNT(*) AS count
      FROM media_items
      WHERE status = 'published'
      GROUP BY category, media_type
    `;
    const countRows = await query(countQuery);
    const countMap = {};
    for (const row of countRows) {
      countMap[`${row.media_type}:${row.category}`] = Number(row.count);
      countMap[`all:${row.category}`] = (countMap[`all:${row.category}`] || 0) + Number(row.count);
    }

    return categories.map((cat) => {
      const row = mapMediaRow(cat);
      const catType = type === 'all' ? 'all' : type;
      row.publishedCount = countMap[`${catType}:${cat.name}`] || countMap[`all:${cat.name}`] || 0;
      return row;
    });
  },
};

export default mediaGalleryRepository;
