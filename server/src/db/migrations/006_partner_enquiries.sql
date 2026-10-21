-- 006_partner_enquiries.sql
-- Table for dedicated Partner With Us enquiries and collaboration requests

CREATE TABLE IF NOT EXISTS partner_enquiries (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name            VARCHAR(150) NOT NULL,
  organization_name    VARCHAR(200) NOT NULL,
  email                VARCHAR(255) NOT NULL,
  phone                VARCHAR(50) NOT NULL,
  country_code         VARCHAR(10) NULL,
  organization_type    VARCHAR(100) NOT NULL,
  location             VARCHAR(150) NOT NULL,
  website_url          VARCHAR(300) NULL,
  partnership_interest VARCHAR(200) NOT NULL,
  message              TEXT NOT NULL,
  status               VARCHAR(40) NOT NULL DEFAULT 'new',
  ip_address           VARCHAR(45) NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_partner_enquiries_status (status),
  KEY idx_partner_enquiries_email (email),
  KEY idx_partner_enquiries_created_at (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
