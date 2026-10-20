-- Additive CRM, newsletter consent, and revocable administrator sessions.
ALTER TABLE users
  MODIFY role ENUM('admin','staff','counsellor','editor') NOT NULL DEFAULT 'staff',
  ADD COLUMN auth_version INT UNSIGNED NOT NULL DEFAULT 0;

ALTER TABLE enquiries
  MODIFY status ENUM('new','contacted','in_progress','qualified','converted','completed','closed','archived') NOT NULL DEFAULT 'new',
  ADD COLUMN current_status ENUM('high_school','college','working') NULL,
  ADD COLUMN target_degree ENUM('ug','pg','mba','undecided') NULL,
  ADD KEY idx_enquiries_funnel (current_status, lead_source, created_at);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(40) NULL,
  source ENUM('newsletter','guide') NOT NULL DEFAULT 'newsletter',
  status ENUM('active','unsubscribed') NOT NULL DEFAULT 'active',
  consent_at DATETIME NOT NULL,
  unsubscribed_at DATETIME NULL,
  unsubscribe_token_hash CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subscribers_email (email),
  UNIQUE KEY uq_subscribers_unsubscribe (unsubscribe_token_hash),
  KEY idx_subscribers_status_source (status,source,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  family_id CHAR(64) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token (token_hash),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_family (family_id),
  KEY idx_sessions_expiry (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
