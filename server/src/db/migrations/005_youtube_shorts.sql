-- Cache official YouTube metadata separately from the existing video catalogue.
-- Shorts identity and categories require evidence; short duration alone is not proof.
CREATE TABLE IF NOT EXISTS youtube_short_registry (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  youtube_id CHAR(11) NOT NULL,
  source_url VARCHAR(500) NOT NULL,
  title VARCHAR(200) NOT NULL DEFAULT '',
  channel_id VARCHAR(64) NULL,
  channel_verified TINYINT(1) NOT NULL DEFAULT 0,
  verified_short TINYINT(1) NOT NULL DEFAULT 0,
  verification_source ENUM('pending','admin','curated_playlist') NOT NULL DEFAULT 'pending',
  title_overridden TINYINT(1) NOT NULL DEFAULT 0,
  duration_seconds INT UNSIGNED NULL,
  published_at DATETIME NULL,
  thumbnail_url VARCHAR(500) NULL,
  availability ENUM('pending','available','unavailable','embedding_disabled') NOT NULL DEFAULT 'pending',
  excluded TINYINT(1) NOT NULL DEFAULT 0,
  video_id INT UNSIGNED NULL,
  last_checked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_youtube_registry_id (youtube_id),
  UNIQUE KEY uq_youtube_registry_video (video_id),
  CONSTRAINT fk_youtube_registry_video FOREIGN KEY (video_id) REFERENCES video_testimonials(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS youtube_sync_state (
  id TINYINT UNSIGNED NOT NULL,
  channel_id VARCHAR(64) NULL,
  uploads_playlist_id VARCHAR(64) NULL,
  last_attempt_at DATETIME NULL,
  last_success_at DATETIME NULL,
  last_error VARCHAR(1000) NULL,
  last_result JSON NULL,
  lock_expires_at DATETIME NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO youtube_sync_state (id) VALUES (1);
