import { query, queryOne, withTransaction } from '../config/db.js';
import { mapRow } from './catalogRepository.js';

/**
 * Media library repository.
 *
 * An asset is the preserved original; every optimised rendition lives in
 * `media_variants` so the original can always be restored and so the CMS can
 * emit `<picture>`/`srcset` markup from real files.
 */

/** Files larger than this are flagged as oversized by the media SEO checks. */
export const OVERSIZED_BYTES = 300 * 1024;

const ASSET_COLUMNS = {
  filename: 'filename',
  originalName: 'original_name',
  url: 'url',
  path: 'path',
  mimeType: 'mime_type',
  extension: 'extension',
  sizeBytes: 'size_bytes',
  width: 'width',
  height: 'height',
  altText: 'alt_text',
  title: 'title',
  caption: 'caption',
  description: 'description',
  folder: 'folder',
  pageId: 'page_id',
  isOptimized: 'is_optimized',
  createdBy: 'created_by',
};

/**
 * Places that store an image URL. Used for "where is this used?" lookups and
 * for detecting genuinely unused assets (the Master Prompt asks for both).
 */
const IMAGE_REFERENCES = [
  { table: 'gallery_images', column: 'image_url', label: 'Gallery image', nameColumn: 'alt_text' },
  { table: 'services', column: 'image_url', label: 'Service image', nameColumn: 'title' },
  { table: 'destinations', column: 'image_url', label: 'Destination image', nameColumn: 'country' },
  { table: 'certifications', column: 'image_url', label: 'Certification image', nameColumn: 'alt_text' },
  { table: 'certifications', column: 'full_url', label: 'Certification full-size image', nameColumn: 'alt_text' },
  { table: 'page_sections', column: 'image_url', label: 'Page section image', nameColumn: 'label' },
  { table: 'page_seo', column: 'og_image', label: 'SEO social sharing image', nameColumn: 'seo_title' },
];

/** Convert a media_assets row into the camelCase shape the API exposes. */
export function mapAsset(row) {
  if (!row) return null;
  const asset = mapRow(row);
  asset.isOptimized = Boolean(row.is_optimized);
  asset.pageId = row.page_id === null || row.page_id === undefined ? null : Number(row.page_id);
  asset.width = row.width === null || row.width === undefined ? null : Number(row.width);
  asset.height = row.height === null || row.height === undefined ? null : Number(row.height);
  asset.sizeBytes = Number(row.size_bytes ?? 0);
  return asset;
}

function mapVariant(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    assetId: Number(row.asset_id),
    format: row.format,
    width: Number(row.width),
    height: Number(row.height),
    sizeBytes: Number(row.size_bytes),
    url: row.url,
    createdAt: row.created_at,
  };
}

function pickColumns(payload) {
  const values = {};
  for (const [key, value] of Object.entries(payload)) {
    const column = ASSET_COLUMNS[key];
    if (column && value !== undefined) {
      values[column] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    }
  }
  return values;
}

/** Every persisted image reference, so unused detection is honest. */
async function referenceValues() {
  const values = [];
  for (const ref of IMAGE_REFERENCES) {
    // eslint-disable-next-line no-await-in-loop -- small, fixed list of tables
    const rows = await query(
      `SELECT ${ref.column} AS value FROM ${ref.table} WHERE ${ref.column} IS NOT NULL AND ${ref.column} <> ''`,
    );
    for (const row of rows) values.push(String(row.value));
  }
  return values;
}

const isReferenced = (asset, values) =>
  values.some((value) => value.includes(asset.filename));

export const mediaRepository = {
  async list({ search, folder, pageId, perPage = 40, page = 1 } = {}) {
    const where = [];
    const params = [];

    if (folder) {
      where.push('folder = ?');
      params.push(folder);
    }
    if (pageId !== undefined && pageId !== null && pageId !== '') {
      where.push('page_id = ?');
      params.push(Number(pageId));
    }
    if (search) {
      where.push('(filename LIKE ? OR original_name LIKE ? OR alt_text LIKE ? OR title LIKE ? OR caption LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * perPage;

    const totalRow = await queryOne(`SELECT COUNT(*) AS total FROM media_assets ${clause}`, params);
    const rows = await query(
      `SELECT * FROM media_assets ${clause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    );

    const items = await this.attachVariants(rows.map(mapAsset));
    const total = Number(totalRow.total);

    return {
      items,
      pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    };
  },

  /** Attach generated renditions to a list of assets in one round trip. */
  async attachVariants(assets) {
    if (assets.length === 0) return assets;
    const ids = assets.map((asset) => asset.id);
    const placeholders = ids.map(() => '?').join(', ');
    const rows = await query(
      `SELECT * FROM media_variants WHERE asset_id IN (${placeholders}) ORDER BY asset_id, width ASC`,
      ids,
    );
    const grouped = new Map();
    for (const row of rows) {
      const key = Number(row.asset_id);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(mapVariant(row));
    }
    return assets.map((asset) => ({ ...asset, variants: grouped.get(asset.id) ?? [] }));
  },

  async findById(id) {
    const row = await queryOne('SELECT * FROM media_assets WHERE id = ? LIMIT 1', [id]);
    if (!row) return null;
    const asset = mapAsset(row);
    const variants = await query('SELECT * FROM media_variants WHERE asset_id = ? ORDER BY width ASC', [id]);
    return { ...asset, variants: variants.map(mapVariant) };
  },

  async findByFilename(filename) {
    const row = await queryOne('SELECT * FROM media_assets WHERE filename = ? LIMIT 1', [filename]);
    return mapAsset(row);
  },

  async create(payload) {
    const values = pickColumns(payload);
    const keys = Object.keys(values);
    const result = await query(
      `INSERT INTO media_assets (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      Object.values(values),
    );
    return this.findById(result.insertId);
  },

  async update(id, payload) {
    const values = pickColumns(payload);
    const keys = Object.keys(values);
    if (keys.length === 0) return this.findById(id);
    await query(
      `UPDATE media_assets SET ${keys.map((key) => `${key} = ?`).join(', ')} WHERE id = ?`,
      [...Object.values(values), id],
    );
    return this.findById(id);
  },

  /** Replace every stored rendition for an asset (used after re-optimisation). */
  async replaceVariants(assetId, variants) {
    await withTransaction(async (connection) => {
      await connection.execute('DELETE FROM media_variants WHERE asset_id = ?', [assetId]);
      for (const variant of variants) {
        await connection.execute(
          `INSERT INTO media_variants (asset_id, format, width, height, size_bytes, url, path)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [assetId, variant.format, variant.width, variant.height, variant.sizeBytes, variant.url, variant.path],
        );
      }
    });
  },

  async remove(id) {
    const result = await query('DELETE FROM media_assets WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  /**
   * Assets that are not assigned to a page and whose filename does not appear in
   * any content column. Computed from real data, never assumed.
   */
  async listUnused() {
    const rows = await query('SELECT * FROM media_assets ORDER BY created_at DESC');
    const assets = rows.map(mapAsset);
    const values = await referenceValues();
    const unused = assets.filter((asset) => asset.pageId === null && !isReferenced(asset, values));
    return this.attachVariants(unused);
  },

  /** "Where is this image used?" - returned to the admin UI and SEO checks. */
  async findUsages(asset) {
    const usages = [];
    if (asset.pageId) {
      const page = await queryOne('SELECT id, name, route FROM pages WHERE id = ? LIMIT 1', [asset.pageId]);
      if (page) usages.push({ type: 'page', id: Number(page.id), label: `Assigned to page "${page.name}"` });
    }

    for (const ref of IMAGE_REFERENCES) {
      // eslint-disable-next-line no-await-in-loop -- fixed, small reference list
      const rows = await query(
        `SELECT id, ${ref.nameColumn} AS name FROM ${ref.table}
         WHERE ${ref.column} = ? OR ${ref.column} LIKE ?`,
        [asset.url, `%${asset.filename}%`],
      );
      for (const row of rows) {
        usages.push({ type: ref.table, id: Number(row.id), label: `${ref.label}: ${row.name ?? `#${row.id}`}` });
      }
    }
    return usages;
  },

  /** Aggregate numbers for the media dashboard cards. */
  async stats() {
    const row = await queryOne(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN alt_text IS NULL OR alt_text = '' THEN 1 ELSE 0 END) AS missing_alt,
         SUM(CASE WHEN size_bytes > ? THEN 1 ELSE 0 END) AS oversized,
         SUM(CASE WHEN is_optimized = 1 THEN 1 ELSE 0 END) AS optimized,
         COALESCE(SUM(size_bytes), 0) AS total_bytes,
         COALESCE(SUM(width * height * 4), 0) AS estimated_decode_bytes
       FROM media_assets`,
      [OVERSIZED_BYTES],
    );

    const variantRow = await queryOne(
      'SELECT COUNT(*) AS total, COALESCE(SUM(size_bytes), 0) AS total_bytes FROM media_variants',
    );

    const unused = await this.listUnused();

    return {
      total: Number(row.total ?? 0),
      missingAlt: Number(row.missing_alt ?? 0),
      oversized: Number(row.oversized ?? 0),
      optimized: Number(row.optimized ?? 0),
      unused: unused.length,
      totalBytes: Number(row.total_bytes ?? 0),
      variants: Number(variantRow.total ?? 0),
      variantBytes: Number(variantRow.total_bytes ?? 0),
      oversizedThresholdBytes: OVERSIZED_BYTES,
    };
  },
};

export default mediaRepository;
