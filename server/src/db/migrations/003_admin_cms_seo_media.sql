-- ---------------------------------------------------------------------------
-- Migration 003: Admin CMS, SEO manager, media library, redirects, audit logs,
-- CRM extensions, FAQs and third-party integrations.
--
-- Adds the tables required by the Master Prompt:
--   pages / page_seo / page_revisions   -> editable pages + SEO metadata
--   page_sections                       -> H1/H2/H3, descriptions, CTAs, captions
--   media_assets / media_variants       -> image library + optimised renditions
--   redirects                           -> server-side 301/302 handling
--   audit_logs                          -> sensitive change trail
--   enquiry_notes                       -> internal (visitor-invisible) notes
--   faqs                                -> editable FAQ content
--   seo_issues / seo_audits             -> real, computed SEO findings
--   integration_settings                -> GSC / GA4 / PageSpeed connection state
--   password_resets                     -> secure administrator recovery
-- ---------------------------------------------------------------------------

-- 1. Page registry -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pages (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(150) NOT NULL,
  route         VARCHAR(255) NOT NULL,
  slug          VARCHAR(190) NULL,
  page_type     ENUM('home','services','service','destinations','destination','about','contact','blog','article','custom')
                NOT NULL DEFAULT 'custom',
  template      VARCHAR(80) NOT NULL DEFAULT 'default',
  status        ENUM('draft','published') NOT NULL DEFAULT 'published',
  is_indexable  TINYINT(1) NOT NULL DEFAULT 1,
  is_system     TINYINT(1) NOT NULL DEFAULT 0,
  sort_order    INT NOT NULL DEFAULT 0,
  published_at  DATETIME NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pages_route (route),
  KEY idx_pages_status (status),
  KEY idx_pages_type (page_type),
  KEY idx_pages_order (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 2. Per-page SEO metadata (1:1 with pages) ----------------------------------
CREATE TABLE IF NOT EXISTS page_seo (
  page_id            INT UNSIGNED NOT NULL,
  seo_title          VARCHAR(255) NULL,
  meta_description    VARCHAR(500) NULL,
  canonical_url      VARCHAR(500) NULL,
  meta_robots        VARCHAR(120) NOT NULL DEFAULT 'index,follow',
  og_title           VARCHAR(255) NULL,
  og_description     VARCHAR(500) NULL,
  og_image           VARCHAR(500) NULL,
  primary_keyword    VARCHAR(150) NULL,
  secondary_keywords VARCHAR(500) NULL,
  structured_data    JSON NULL,
  draft_payload      JSON NULL,
  status             ENUM('draft','published') NOT NULL DEFAULT 'published',
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (page_id),
  KEY idx_page_seo_status (status),
  CONSTRAINT fk_page_seo_page FOREIGN KEY (page_id)
    REFERENCES pages (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3. Structured page sections (headings, copy, CTAs, captions) ---------------
CREATE TABLE IF NOT EXISTS page_sections (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  page_id       INT UNSIGNED NOT NULL,
  section_key   VARCHAR(100) NOT NULL,
  label         VARCHAR(150) NULL,
  heading_level ENUM('none','h1','h2','h3','h4') NOT NULL DEFAULT 'h2',
  heading_text  TEXT NULL,
  description   TEXT NULL,
  cta_label     VARCHAR(150) NULL,
  cta_url       VARCHAR(500) NULL,
  image_url     VARCHAR(500) NULL,
  image_alt     VARCHAR(255) NULL,
  image_caption VARCHAR(255) NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_page_sections_key (page_id, section_key),
  KEY idx_page_sections_order (page_id, sort_order),
  CONSTRAINT fk_page_sections_page FOREIGN KEY (page_id)
    REFERENCES pages (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 4. Publishing history / revisions -----------------------------------------
CREATE TABLE IF NOT EXISTS page_revisions (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  page_id     INT UNSIGNED NOT NULL,
  entity      ENUM('page','seo','sections') NOT NULL DEFAULT 'seo',
  snapshot    JSON NOT NULL,
  change_note VARCHAR(255) NULL,
  created_by  INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_page_revisions_page (page_id, created_at),
  CONSTRAINT fk_page_revisions_page FOREIGN KEY (page_id)
    REFERENCES pages (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_page_revisions_user FOREIGN KEY (created_by)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 5. Media library -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  filename      VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NULL,
  url           VARCHAR(500) NOT NULL,
  path          VARCHAR(500) NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  extension     VARCHAR(20) NOT NULL,
  size_bytes    INT UNSIGNED NOT NULL DEFAULT 0,
  width         INT UNSIGNED NULL,
  height        INT UNSIGNED NULL,
  alt_text      VARCHAR(255) NULL,
  title         VARCHAR(255) NULL,
  caption       VARCHAR(500) NULL,
  description   TEXT NULL,
  folder        VARCHAR(150) NOT NULL DEFAULT 'general',
  page_id       INT UNSIGNED NULL,
  is_optimized  TINYINT(1) NOT NULL DEFAULT 0,
  created_by    INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_media_filename (filename),
  KEY idx_media_folder (folder),
  KEY idx_media_page (page_id),
  KEY idx_media_alt (alt_text(100)),
  CONSTRAINT fk_media_page FOREIGN KEY (page_id)
    REFERENCES pages (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_media_user FOREIGN KEY (created_by)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media_variants (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  asset_id   INT UNSIGNED NOT NULL,
  format     ENUM('original','webp','avif','jpeg','png') NOT NULL,
  width      INT UNSIGNED NOT NULL DEFAULT 0,
  height     INT UNSIGNED NOT NULL DEFAULT 0,
  size_bytes INT UNSIGNED NOT NULL DEFAULT 0,
  url        VARCHAR(500) NOT NULL,
  path       VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_media_variant (asset_id, format, width),
  CONSTRAINT fk_media_variants_asset FOREIGN KEY (asset_id)
    REFERENCES media_assets (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 6. Redirects ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS redirects (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_path      VARCHAR(500) NOT NULL,
  destination_path VARCHAR(500) NOT NULL,
  status_code      SMALLINT UNSIGNED NOT NULL DEFAULT 301,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  note             VARCHAR(255) NULL,
  hits             INT UNSIGNED NOT NULL DEFAULT 0,
  last_hit_at      DATETIME NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_redirects_source (source_path),
  KEY idx_redirects_active (is_active)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 7. Audit log ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NULL,
  user_email  VARCHAR(190) NULL,
  action      VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id   VARCHAR(80) NULL,
  summary     VARCHAR(500) NULL,
  changes     JSON NULL,
  ip_address  VARCHAR(45) NULL,
  user_agent  VARCHAR(255) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_created (created_at),
  KEY idx_audit_user (user_id),
  KEY idx_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 8. Internal enquiry notes (never exposed publicly) -------------------------
CREATE TABLE IF NOT EXISTS enquiry_notes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  enquiry_id INT UNSIGNED NOT NULL,
  author_id  INT UNSIGNED NULL,
  note       TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_enquiry_notes_enquiry (enquiry_id, created_at),
  CONSTRAINT fk_enquiry_notes_enquiry FOREIGN KEY (enquiry_id)
    REFERENCES enquiries (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_enquiry_notes_author FOREIGN KEY (author_id)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 9. FAQs --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS faqs (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question   VARCHAR(500) NOT NULL,
  answer     TEXT NOT NULL,
  category   VARCHAR(100) NULL,
  page_id    INT UNSIGNED NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_faqs_order (sort_order),
  KEY idx_faqs_page (page_id),
  CONSTRAINT fk_faqs_page FOREIGN KEY (page_id)
    REFERENCES pages (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 10. SEO audit runs and findings -------------------------------------------
CREATE TABLE IF NOT EXISTS seo_audits (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  triggered_by   INT UNSIGNED NULL,
  scope          VARCHAR(50) NOT NULL DEFAULT 'full',
  pages_scanned  INT UNSIGNED NOT NULL DEFAULT 0,
  issues_found   INT UNSIGNED NOT NULL DEFAULT 0,
  started_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at    DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_seo_audits_started (started_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seo_issues (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  audit_id       INT UNSIGNED NULL,
  page_id        INT UNSIGNED NULL,
  asset_id       INT UNSIGNED NULL,
  check_key      VARCHAR(80) NOT NULL,
  category       ENUM('title','meta','headings','images','links','canonical','indexing','structured_data','performance','mobile','sitemap','redirects')
                 NOT NULL DEFAULT 'meta',
  severity       ENUM('critical','warning','notice','good') NOT NULL DEFAULT 'warning',
  message        VARCHAR(500) NOT NULL,
  detail         TEXT NULL,
  recommendation TEXT NULL,
  status         ENUM('open','fixed','ignored','awaiting_verification') NOT NULL DEFAULT 'open',
  is_automated   TINYINT(1) NOT NULL DEFAULT 1,
  detected_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at    DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_seo_issue (check_key, page_id, asset_id),
  KEY idx_seo_issues_status (status),
  KEY idx_seo_issues_severity (severity),
  KEY idx_seo_issues_page (page_id),
  CONSTRAINT fk_seo_issues_page FOREIGN KEY (page_id)
    REFERENCES pages (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_seo_issues_asset FOREIGN KEY (asset_id)
    REFERENCES media_assets (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 11. Third-party integrations ----------------------------------------------
-- Only non-secret configuration is stored here. API keys, service-account
-- credentials and OAuth tokens stay in backend environment variables.
CREATE TABLE IF NOT EXISTS integration_settings (
  provider       VARCHAR(50) NOT NULL,
  is_enabled     TINYINT(1) NOT NULL DEFAULT 0,
  config         JSON NULL,
  status         ENUM('disconnected','connected','error') NOT NULL DEFAULT 'disconnected',
  last_synced_at DATETIME NULL,
  last_error     TEXT NULL,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (provider)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 12. Secure password recovery ----------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_password_resets_user (user_id),
  KEY idx_password_resets_token (token_hash),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 13. Enquiry CRM columns ----------------------------------------------------
ALTER TABLE enquiries
  ADD COLUMN country_code  VARCHAR(10)  NULL AFTER phone,
  ADD COLUMN lead_source   VARCHAR(80)  NULL AFTER source,
  ADD COLUMN landing_page  VARCHAR(500) NULL AFTER lead_source,
  ADD COLUMN follow_up_at  DATETIME     NULL AFTER assigned_to,
  ADD COLUMN anonymized_at DATETIME     NULL AFTER follow_up_at;

ALTER TABLE enquiries
  ADD KEY idx_enquiries_follow_up (follow_up_at),
  ADD KEY idx_enquiries_lead_source (lead_source);

-- Recreate the status enum so 'qualified' and 'converted' are both available.
ALTER TABLE enquiries MODIFY COLUMN status
  ENUM('new','contacted','in_progress','qualified','converted','completed','closed')
  NOT NULL DEFAULT 'new';

-- 14. Administrator security columns ----------------------------------------
ALTER TABLE users
  ADD COLUMN two_factor_secret  VARCHAR(255) NULL AFTER password_hash,
  ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER two_factor_secret,
  ADD COLUMN password_changed_at DATETIME NULL AFTER two_factor_enabled,
  ADD COLUMN failed_login_count  TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER password_changed_at,
  ADD COLUMN locked_until        DATETIME NULL AFTER failed_login_count;

-- 15. Seed the initial page registry from the routes the site already serves --
INSERT INTO pages (name, route, page_type, status, is_indexable, is_system, sort_order, published_at)
SELECT * FROM (
  SELECT 'Homepage' AS name, '/' AS route, 'home' AS page_type, 'published' AS status, 1 AS is_indexable, 1 AS is_system, 1 AS sort_order, NOW() AS published_at UNION ALL
  SELECT 'Services Overview', '/services', 'services', 'published', 1, 1, 2, NOW()
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM pages LIMIT 1);

INSERT INTO page_seo (page_id, seo_title, meta_description, meta_robots, primary_keyword, status)
SELECT p.id,
       CONCAT('G3B Education | ', p.name, ' - Study Abroad & Career Guidance in Navi Mumbai'),
       'Career guidance, psychometric assessment, IELTS/PTE preparation and end-to-end study abroad admissions support from Nerul, Navi Mumbai.',
       'index,follow',
       'study abroad consultants Navi Mumbai',
       'published'
FROM pages p
LEFT JOIN page_seo s ON s.page_id = p.id
WHERE s.page_id IS NULL;

-- 16. Seed integration placeholders so the dashboard can show real state ----
INSERT IGNORE INTO integration_settings (provider, is_enabled, status) VALUES
  ('google_search_console', 0, 'disconnected'),
  ('google_analytics', 0, 'disconnected'),
  ('pagespeed_insights', 0, 'disconnected');
