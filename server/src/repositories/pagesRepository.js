import { query, queryOne, withTransaction } from '../config/db.js';

const toCamel = (key) => key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());

/** PostgreSQL normally returns JSON columns parsed, but never assume it. */
function parseJsonSafe(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function stringifyJsonSafe(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/** camelCase SEO payload key -> page_seo column. */
const SEO_COLUMNS = {
  seoTitle: 'seo_title',
  metaDescription: 'meta_description',
  canonicalUrl: 'canonical_url',
  metaRobots: 'meta_robots',
  ogTitle: 'og_title',
  ogDescription: 'og_description',
  ogImage: 'og_image',
  primaryKeyword: 'primary_keyword',
  secondaryKeywords: 'secondary_keywords',
};

/** camelCase page payload key -> pages column. */
const PAGE_COLUMNS = {
  name: 'name',
  route: 'route',
  slug: 'slug',
  pageType: 'page_type',
  template: 'template',
  status: 'status',
  isIndexable: 'is_indexable',
  sortOrder: 'sort_order',
};

/** camelCase section payload key -> page_sections column. */
const SECTION_COLUMNS = {
  label: 'label',
  headingLevel: 'heading_level',
  headingText: 'heading_text',
  description: 'description',
  ctaLabel: 'cta_label',
  ctaUrl: 'cta_url',
  imageUrl: 'image_url',
  imageAlt: 'image_alt',
  imageCaption: 'image_caption',
  sortOrder: 'sort_order',
  isActive: 'is_active',
};

const BOOLEAN_COLUMNS = new Set(['is_indexable', 'is_active']);

/** Reduce a payload to the columns that exist in the target table. */
function pickColumns(payload, columns) {
  const values = {};
  for (const [key, column] of Object.entries(columns)) {
    const value = payload[key];
    if (value === undefined) continue;
    values[column] = BOOLEAN_COLUMNS.has(column) ? (value ? 1 : 0) : value;
  }
  return values;
}

/** Build "col = ?, col2 = ?" assignments plus the ordered values array. */
function assignments(values) {
  const keys = Object.keys(values);
  return {
    sql: keys.map((key) => `${key} = ?`).join(', '),
    values: keys.map((key) => values[key]),
  };
}

function mapPage(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    route: row.route,
    slug: row.slug,
    pageType: row.page_type,
    template: row.template,
    status: row.status,
    isIndexable: Boolean(row.is_indexable),
    isSystem: Boolean(row.is_system),
    sortOrder: Number(row.sort_order),
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSeo(row) {
  if (!row) return null;
  return {
    pageId: Number(row.page_id),
    seoTitle: row.seo_title,
    metaDescription: row.meta_description,
    canonicalUrl: row.canonical_url,
    metaRobots: row.meta_robots,
    ogTitle: row.og_title,
    ogDescription: row.og_description,
    ogImage: row.og_image,
    primaryKeyword: row.primary_keyword,
    secondaryKeywords: row.secondary_keywords,
    structuredData: parseJsonSafe(row.structured_data, null),
    draftPayload: parseJsonSafe(row.draft_payload, null),
    status: row.status,
    updatedAt: row.updated_at,
  };
}

export function mapSection(row) {
  if (!row) return null;
  const output = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = toCamel(key);
    if (camelKey === 'id' || camelKey === 'pageId' || camelKey === 'sortOrder') {
      output[camelKey] = value === null ? null : Number(value);
    } else if (camelKey === 'isActive') {
      output[camelKey] = Boolean(value);
    } else {
      output[camelKey] = value;
    }
  }
  return output;
}

/** Build the page + SEO summary select shared by the list and detail queries. */
const PAGE_SELECT = `
  SELECT p.*,
         s.seo_title, s.meta_description, s.canonical_url, s.meta_robots,
         s.og_title, s.og_description, s.og_image,
         s.primary_keyword, s.secondary_keywords, s.structured_data,
         s.draft_payload, s.status AS seo_status, s.updated_at AS seo_updated_at
  FROM pages p
  LEFT JOIN page_seo s ON s.page_id = p.id`;

function withSeo(pageRow) {
  if (!pageRow) return null;
  const page = mapPage(pageRow);
  page.seo = {
    seoTitle: pageRow.seo_title,
    metaDescription: pageRow.meta_description,
    canonicalUrl: pageRow.canonical_url,
    metaRobots: pageRow.meta_robots,
    ogTitle: pageRow.og_title,
    ogDescription: pageRow.og_description,
    ogImage: pageRow.og_image,
    primaryKeyword: pageRow.primary_keyword,
    secondaryKeywords: pageRow.secondary_keywords,
    structuredData: parseJsonSafe(pageRow.structured_data, null),
    hasDraft: pageRow.draft_payload !== null && pageRow.draft_payload !== undefined,
    status: pageRow.seo_status,
    updatedAt: pageRow.seo_updated_at,
  };
  return page;
}

/**
 * Pages, their SEO metadata, structured sections and publishing history.
 *
 * `pages` is the registry of real routes; `page_seo` holds the metadata that is
 * rendered into the public HTML; `page_sections` holds the editable headings and
 * copy; `page_revisions` stores snapshots so a change can be rolled back.
 */
export const pagesRepository = {
  async list({ status = null, includeSeo = true } = {}) {
    const where = status ? ' WHERE p.status = ?' : '';
    const rows = await query(
      `${PAGE_SELECT}${where} ORDER BY p.sort_order ASC, p.id ASC`,
      status ? [status] : [],
    );
    if (!includeSeo) return rows.map(mapPage);
    return rows.map(withSeo);
  },

  /** Full detail: page, SEO metadata, structured sections and revision count. */
  async findById(id) {
    const row = await queryOne(`${PAGE_SELECT} WHERE p.id = ? LIMIT 1`, [id]);
    if (!row) return null;
    const page = withSeo(row);
    const [sections, revisionCount] = await Promise.all([
      this.listSections(id),
      queryOne('SELECT COUNT(*) AS total FROM page_revisions WHERE page_id = ?', [id]),
    ]);
    page.sections = sections;
    page.revisionCount = Number(revisionCount?.total || 0);
    return page;
  },

  /** Public lookup: only published, indexable-aware pages are ever returned. */
  async findPublishedByRoute(route) {
    const row = await queryOne(
      `${PAGE_SELECT} WHERE p.route = ? AND p.status = 'published' LIMIT 1`,
      [route],
    );
    if (!row) return null;
    const page = withSeo(row);
    page.sections = (await this.listSections(row.id)).filter((section) => section.isActive);
    return page;
  },

  async findRouteOwner(route, excludeId = null) {
    if (excludeId !== null && excludeId !== undefined) {
      const row = await queryOne(
        'SELECT id, name FROM pages WHERE route = ? AND id <> ? LIMIT 1',
        [route, excludeId],
      );
      return row || null;
    }
    const row = await queryOne(
      'SELECT id, name FROM pages WHERE route = ? LIMIT 1',
      [route],
    );
    return row || null;
  },

  async create(payload, userId = null) {
    return withTransaction(async (connection) => {
      const [result] = await connection.execute(
        `INSERT INTO pages (name, route, slug, page_type, template, status, is_indexable, sort_order, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.name,
          payload.route,
          payload.slug ?? null,
          payload.pageType ?? 'custom',
          payload.template ?? 'default',
          payload.status ?? 'draft',
          payload.isIndexable === false ? 0 : 1,
          payload.sortOrder ?? 0,
          payload.status === 'published' ? new Date() : null,
        ],
      );

      await connection.execute(
        `INSERT INTO page_seo (page_id, meta_robots, status) VALUES (?, 'index,follow', ?)
         ON CONFLICT (page_id) DO NOTHING`,
        [result.insertId, payload.status === 'published' ? 'published' : 'draft'],
      );

      await connection.execute(
        'INSERT INTO page_revisions (page_id, entity, snapshot, change_note, created_by) VALUES (?, ?, ?, ?, ?)',
        [result.insertId, 'page', JSON.stringify({ created: payload }), 'Page created', userId],
      );

      return result.insertId;
    }).then((id) => this.findById(id));
  },

  async update(id, payload, userId = null) {
    const values = pickColumns(payload, PAGE_COLUMNS);
    if (payload.isIndexable !== undefined) values.is_indexable = payload.isIndexable ? 1 : 0;
    if (payload.status === 'published') values.published_at = new Date();

    if (Object.keys(values).length > 0) {
      const { sql, values: params } = assignments(values);
      await query(`UPDATE pages SET ${sql} WHERE id = ?`, [...params, id]);
    }

    if (userId) {
      const page = await queryOne('SELECT * FROM pages WHERE id = ? LIMIT 1', [id]);
      await query(
        'INSERT INTO page_revisions (page_id, entity, snapshot, change_note, created_by) VALUES (?, ?, ?, ?, ?)',
        [id, 'page', JSON.stringify(mapPage(page)), 'Page settings updated', userId],
      );
    }

    return this.findById(id);
  },

  async remove(id) {
    const result = await query('DELETE FROM pages WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  // --- SEO metadata --------------------------------------------------------

  async findSeo(pageId) {
    const row = await queryOne('SELECT * FROM page_seo WHERE page_id = ? LIMIT 1', [pageId]);
    return mapSeo(row);
  },

  /**
   * Persist SEO metadata.
   * - mode 'publish' writes the live columns rendered into the public HTML.
   * - mode 'draft' stores the pending values in `draft_payload` only.
   */
  async saveSeo(pageId, payload, { mode = 'draft', userId = null } = {}) {
    const values = pickColumns(payload, SEO_COLUMNS);
    if (payload.structuredData !== undefined) {
      values.structured_data = stringifyJsonSafe(payload.structuredData);
    }

    const existing = await queryOne('SELECT * FROM page_seo WHERE page_id = ? LIMIT 1', [pageId]);
    if (!existing) {
      await query(
        `INSERT INTO page_seo (page_id, meta_robots, status) VALUES (?, 'index,follow', 'draft')`,
        [pageId],
      );
    }

    if (mode === 'publish') {
      const merged = { ...values };
      if (!merged.meta_robots) merged.meta_robots = 'index,follow';
      merged.status = 'published';
      merged.draft_payload = null;
      const { sql, values: params } = assignments(merged);
      await query(`UPDATE page_seo SET ${sql} WHERE page_id = ?`, [...params, pageId]);
    } else {
      const current = await queryOne('SELECT * FROM page_seo WHERE page_id = ? LIMIT 1', [pageId]);
      const draft = {
        ...parseJsonSafe(current?.draft_payload, {}),
        ...payload,
      };
      // Trim keys that should never be stored inside the draft blob.
      delete draft.pageId;
      delete draft.draftPayload;
      delete draft.publish;
      await query(
        `UPDATE page_seo SET draft_payload = ?, status = 'draft' WHERE page_id = ?`,
        [stringifyJsonSafe(draft), pageId],
      );
    }

    if (mode === 'publish' && userId) {
      // Revisions record *published* versions, because those are what rollback
      // restores. Draft saves are recorded in the audit trail instead.
      const live = await this.findSeo(pageId);
      if (live) delete live.draftPayload;
      await query(
        'INSERT INTO page_revisions (page_id, entity, snapshot, change_note, created_by) VALUES (?, ?, ?, ?, ?)',
        [pageId, 'seo', JSON.stringify(live), 'SEO metadata published', userId],
      );
    }

    return this.findSeo(pageId);
  },

  /** Promote `draft_payload` into the live columns rendered publicly. */
  async publishSeo(pageId, userId = null, changeNote = 'SEO metadata published') {
    return withTransaction(async (connection) => {
      const [rows] = await connection.execute('SELECT * FROM page_seo WHERE page_id = ? LIMIT 1', [
        pageId,
      ]);
      const current = rows[0];
      if (!current) return null;

      const draft = parseJsonSafe(current.draft_payload, null);
      const values = {};
      if (draft && typeof draft === 'object') {
        Object.assign(values, pickColumns(draft, SEO_COLUMNS));
        if (draft.structuredData !== undefined) {
          values.structured_data = stringifyJsonSafe(draft.structuredData);
        }
      }

      const columns = { ...values, status: 'published', draft_payload: null };
      const { sql, values: params } = assignments(columns);
      await connection.execute(`UPDATE page_seo SET ${sql} WHERE page_id = ?`, [...params, pageId]);

      const [updated] = await connection.execute('SELECT * FROM page_seo WHERE page_id = ? LIMIT 1', [
        pageId,
      ]);
      const live = mapSeo(updated[0]);
      delete live.draftPayload;
      await connection.execute(
        'INSERT INTO page_revisions (page_id, entity, snapshot, change_note, created_by) VALUES (?, ?, ?, ?, ?)',
        [pageId, 'seo', JSON.stringify(live), changeNote, userId],
      );

      return mapSeo(updated[0]);
    });
  },

  // --- Structured sections -------------------------------------------------

  async listSections(pageId) {
    const rows = await query(
      'SELECT * FROM page_sections WHERE page_id = ? ORDER BY sort_order ASC, id ASC',
      [pageId],
    );
    return rows.map(mapSection);
  },

  async upsertSection(pageId, sectionKey, payload, userId = null) {
    const values = pickColumns(payload, SECTION_COLUMNS);
    if (payload.isActive !== undefined) values.is_active = payload.isActive ? 1 : 0;

    const keys = Object.keys(values);
    const columns = ['page_id', 'section_key', ...keys];
    const placeholders = columns.map(() => '?').join(', ');
    const updates = keys.map((key) => `${key} = EXCLUDED.${key}`).join(', ');

    await query(
      `INSERT INTO page_sections (${columns.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (page_id, section_key) DO UPDATE SET ${updates || 'section_key = EXCLUDED.section_key'}`,
      [pageId, sectionKey, ...keys.map((key) => values[key])],
    );

    const row = await queryOne(
      'SELECT * FROM page_sections WHERE page_id = ? AND section_key = ? LIMIT 1',
      [pageId, sectionKey],
    );

    if (userId) {
      await query(
        'INSERT INTO page_revisions (page_id, entity, snapshot, change_note, created_by) VALUES (?, ?, ?, ?, ?)',
        [
          pageId,
          'sections',
          JSON.stringify({ sectionKey, ...mapSection(row) }),
          `Section "${sectionKey}" updated`,
          userId,
        ],
      );
    }

    return mapSection(row);
  },

  async removeSection(pageId, sectionKey) {
    const result = await query('DELETE FROM page_sections WHERE page_id = ? AND section_key = ?', [
      pageId,
      sectionKey,
    ]);
    return result.affectedRows > 0;
  },

  async reorderSections(pageId, orderedKeys) {
    await withTransaction(async (connection) => {
      for (const [index, key] of orderedKeys.entries()) {
        await connection.execute(
          'UPDATE page_sections SET sort_order = ? WHERE page_id = ? AND section_key = ?',
          [index, pageId, key],
        );
      }
    });
    return this.listSections(pageId);
  },

  // --- Revisions -----------------------------------------------------------

  async listRevisions(pageId, limit = 50) {
    const rows = await query(
      `SELECT r.*, u.email AS created_by_email
       FROM page_revisions r
       LEFT JOIN users u ON u.id = r.created_by
       WHERE r.page_id = ?
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT ?`,
      [pageId, Number(limit) || 50],
    );
    return rows.map((row) => ({
      id: Number(row.id),
      pageId: Number(row.page_id),
      entity: row.entity,
      snapshot: parseJsonSafe(row.snapshot, null),
      changeNote: row.change_note,
      createdBy: row.created_by === null ? null : Number(row.created_by),
      createdByEmail: row.created_by_email,
      createdAt: row.created_at,
    }));
  },

  /** Restore a previous snapshot and record the rollback as a new revision. */
  async rollback(pageId, revisionId, userId = null) {
    const revision = await queryOne(
      'SELECT * FROM page_revisions WHERE id = ? AND page_id = ? LIMIT 1',
      [revisionId, pageId],
    );
    if (!revision) return null;

    const snapshot = parseJsonSafe(revision.snapshot, null);
    if (!snapshot) return null;

    await withTransaction(async (connection) => {
      if (revision.entity === 'page') {
        const values = pickColumns(snapshot, PAGE_COLUMNS);
        const keys = Object.keys(values);
        if (keys.length > 0) {
          const sql = keys.map((key) => `${key} = ?`).join(', ');
          await connection.execute(
            `UPDATE pages SET ${sql} WHERE id = ?`,
            [...keys.map((key) => values[key]), pageId],
          );
        }
      } else if (revision.entity === 'seo') {
        const values = pickColumns(snapshot, SEO_COLUMNS);
        if (snapshot.structuredData !== undefined) {
          values.structured_data = stringifyJsonSafe(snapshot.structuredData);
        }
        const keys = Object.keys(values);
        if (keys.length > 0) {
          const sql = keys.map((key) => `${key} = ?`).join(', ');
          await connection.execute(
            `UPDATE page_seo SET ${sql}, status = 'published', draft_payload = NULL WHERE page_id = ?`,
            [...keys.map((key) => values[key]), pageId],
          );
        }
      } else if (revision.entity === 'sections' && snapshot.sectionKey) {
        const values = pickColumns(snapshot, SECTION_COLUMNS);
        if (snapshot.isActive !== undefined) values.is_active = snapshot.isActive ? 1 : 0;
        const keys = Object.keys(values);
        if (keys.length > 0) {
          const sql = keys.map((key) => `${key} = ?`).join(', ');
          await connection.execute(
            `UPDATE page_sections SET ${sql} WHERE page_id = ? AND section_key = ?`,
            [...keys.map((key) => values[key]), pageId, snapshot.sectionKey],
          );
        }
      }

      await connection.execute(
        'INSERT INTO page_revisions (page_id, entity, snapshot, change_note, created_by) VALUES (?, ?, ?, ?, ?)',
        [pageId, revision.entity, JSON.stringify(snapshot), `Rolled back to revision #${revisionId}`, userId],
      );
    });

    return this.findById(pageId);
  },
};

export default pagesRepository;
