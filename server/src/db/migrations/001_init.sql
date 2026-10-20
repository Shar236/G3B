-- ---------------------------------------------------------------------------
-- G3B Education - initial schema
-- All tables use InnoDB / utf8mb4 so foreign keys and emoji content work.
-- ---------------------------------------------------------------------------

-- Users / administrators ----------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name           VARCHAR(150) NOT NULL,
  email          VARCHAR(190) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
  status         ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  last_login_at  DATETIME NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Enquiries -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enquiries (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name             VARCHAR(150) NOT NULL,
  email                 VARCHAR(190) NOT NULL,
  phone                 VARCHAR(40)  NOT NULL,
  service_interest      VARCHAR(150) NOT NULL,
  preferred_destination VARCHAR(120) NULL,
  message               TEXT NULL,
  status                ENUM('new', 'contacted', 'in_progress', 'completed', 'closed') NOT NULL DEFAULT 'new',
  assigned_to           INT UNSIGNED NULL,
  source                VARCHAR(80) NOT NULL DEFAULT 'website',
  ip_address            VARCHAR(45) NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_enquiries_status (status),
  KEY idx_enquiries_created (created_at),
  KEY idx_enquiries_assigned (assigned_to),
  KEY idx_enquiries_email (email),
  CONSTRAINT fk_enquiries_assigned_to FOREIGN KEY (assigned_to)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Email notification queue (retry when SMTP fails) --------------------------
CREATE TABLE IF NOT EXISTS enquiry_notifications (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  enquiry_id  INT UNSIGNED NOT NULL,
  recipient   VARCHAR(190) NOT NULL,
  subject     VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  kind        ENUM('admin', 'visitor') NOT NULL DEFAULT 'admin',
  status      ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  last_error  TEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at     DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_notifications_status (status),
  KEY idx_notifications_enquiry (enquiry_id),
  CONSTRAINT fk_notifications_enquiry FOREIGN KEY (enquiry_id)
    REFERENCES enquiries (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Editable content blocks (hero, section headings, CTA bands, footer...) ---
CREATE TABLE IF NOT EXISTS content_blocks (
  block_key   VARCHAR(100) NOT NULL,
  heading     TEXT NULL,
  subheading  TEXT NULL,
  body        TEXT NULL,
  cta_label   VARCHAR(150) NULL,
  cta_url     VARCHAR(500) NULL,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (block_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Homepage statistics -------------------------------------------------------
CREATE TABLE IF NOT EXISTS stats (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  value       VARCHAR(40) NOT NULL,
  label       VARCHAR(120) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_stats_order (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- "Why choose" highlight features ------------------------------------------
CREATE TABLE IF NOT EXISTS why_features (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  icon        VARCHAR(80) NOT NULL DEFAULT 'fas fa-check',
  text        VARCHAR(255) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_why_features_order (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Certifications ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certifications (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  alt_text    VARCHAR(200) NOT NULL,
  image_url   VARCHAR(500) NOT NULL,
  full_url    VARCHAR(500) NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_certifications_order (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Services ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title        VARCHAR(200) NOT NULL,
  description  TEXT NULL,
  image_url    VARCHAR(500) NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_services_order (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_features (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  service_id  INT UNSIGNED NOT NULL,
  text        VARCHAR(255) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_service_features_service (service_id),
  CONSTRAINT fk_service_features_service FOREIGN KEY (service_id)
    REFERENCES services (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Study destinations --------------------------------------------------------
CREATE TABLE IF NOT EXISTS destinations (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  country      VARCHAR(120) NOT NULL,
  description  TEXT NULL,
  image_url    VARCHAR(500) NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_destinations_country (country),
  KEY idx_destinations_order (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS destination_points (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  destination_id  INT UNSIGNED NOT NULL,
  text            VARCHAR(255) NOT NULL,
  sort_order      INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_destination_points_destination (destination_id),
  CONSTRAINT fk_destination_points_destination FOREIGN KEY (destination_id)
    REFERENCES destinations (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Gallery -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_images (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  alt_text    VARCHAR(200) NOT NULL,
  image_url   VARCHAR(500) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gallery_order (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Testimonials (Google reviews + written) -----------------------------------
CREATE TABLE IF NOT EXISTS testimonials (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  author_name  VARCHAR(150) NOT NULL,
  author_role  VARCHAR(150) NULL,
  avatar_text  VARCHAR(6) NULL,
  content      TEXT NOT NULL,
  rating       TINYINT UNSIGNED NOT NULL DEFAULT 5,
  source       ENUM('google', 'website') NOT NULL DEFAULT 'google',
  source_url   VARCHAR(500) NULL,
  posted_label VARCHAR(80) NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_testimonials_order (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Video testimonials --------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_testimonials (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title         VARCHAR(200) NOT NULL,
  youtube_id    VARCHAR(40) NOT NULL,
  youtube_url   VARCHAR(500) NOT NULL,
  orientation   ENUM('landscape', 'portrait') NOT NULL DEFAULT 'landscape',
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_video_testimonials_order (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Process steps -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS process_steps (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  step_number  INT NOT NULL,
  title        VARCHAR(150) NOT NULL,
  description  VARCHAR(400) NULL,
  badge        VARCHAR(80) NULL,
  icon         VARCHAR(80) NOT NULL DEFAULT 'fas fa-check',
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_process_steps_order (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Enquiry form service options ---------------------------------------------
CREATE TABLE IF NOT EXISTS enquiry_options (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  label       VARCHAR(150) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_enquiry_options_order (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Social links --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS social_links (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  platform    VARCHAR(80) NOT NULL,
  url         VARCHAR(500) NOT NULL,
  icon        VARCHAR(80) NOT NULL DEFAULT 'fab fa-facebook-f',
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_social_links_order (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Key/value site settings (contact details, review summary, SEO defaults...) -
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key    VARCHAR(100) NOT NULL,
  setting_value  TEXT NULL,
  setting_group  VARCHAR(50) NOT NULL DEFAULT 'general',
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key),
  KEY idx_site_settings_group (setting_group)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
