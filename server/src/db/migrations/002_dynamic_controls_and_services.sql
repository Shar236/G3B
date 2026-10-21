-- ---------------------------------------------------------------------------
-- Migration 002: Dynamic navigation, enhanced services architecture,
-- destination metrics, video categories and enquiry status.
-- ---------------------------------------------------------------------------

-- 1. Navigation items table for full admin control of header/navigation menus
CREATE TABLE IF NOT EXISTS navigation_items (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  label          VARCHAR(100) NOT NULL,
  url            VARCHAR(255) NOT NULL,
  sort_order     INT NOT NULL DEFAULT 0,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  open_new_tab   TINYINT(1) NOT NULL DEFAULT 0,
  is_button      TINYINT(1) NOT NULL DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_navigation_items_order (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 2. Update enquiries status enum to include 'converted'
ALTER TABLE enquiries MODIFY COLUMN status ENUM('new', 'contacted', 'in_progress', 'converted', 'completed', 'closed') NOT NULL DEFAULT 'new';

-- 3. Enhance destinations table with flag icons, stay-back times, work rights, and details
ALTER TABLE destinations
  ADD COLUMN flag_icon VARCHAR(100) NULL AFTER country,
  ADD COLUMN stay_back_time VARCHAR(150) NULL AFTER description,
  ADD COLUMN work_rights VARCHAR(150) NULL AFTER stay_back_time,
  ADD COLUMN detail_link VARCHAR(500) NULL AFTER work_rights,
  ADD COLUMN currency_symbol VARCHAR(20) NULL AFTER detail_link,
  ADD COLUMN avg_tuition VARCHAR(150) NULL AFTER currency_symbol;

-- 4. Enhance video testimonials with categories/tags for category filtering
ALTER TABLE video_testimonials
  ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT 'Student Review' AFTER title,
  ADD COLUMN student_name VARCHAR(150) NULL AFTER category,
  ADD COLUMN destination_country VARCHAR(100) NULL AFTER student_name;

-- 5. Enhance gallery images with caption and category
ALTER TABLE gallery_images
  ADD COLUMN caption VARCHAR(255) NULL AFTER alt_text,
  ADD COLUMN category VARCHAR(100) NULL DEFAULT 'Life at G3B' AFTER caption;

-- 6. Enhance services table with slug, subtitle, badge, icon, and rich JSON content
ALTER TABLE services
  ADD COLUMN slug VARCHAR(120) NULL AFTER title,
  ADD COLUMN subtitle VARCHAR(255) NULL AFTER slug,
  ADD COLUMN badge VARCHAR(100) NULL AFTER subtitle,
  ADD COLUMN icon VARCHAR(100) NULL DEFAULT 'fas fa-graduation-cap' AFTER badge,
  ADD COLUMN packages_json JSON NULL AFTER description,
  ADD COLUMN pricing_json JSON NULL AFTER packages_json,
  ADD COLUMN trainers_json JSON NULL AFTER pricing_json,
  ADD COLUMN faqs_json JSON NULL AFTER trainers_json,
  ADD COLUMN cta_label VARCHAR(150) NULL DEFAULT 'Book Counselling for this Service' AFTER faqs_json;

-- 7. Seed default navigation items if empty
INSERT INTO navigation_items (label, url, sort_order, is_active, open_new_tab, is_button)
SELECT * FROM (
  SELECT 'Why G3B' AS label, '/#why' AS url, 1 AS sort_order, 1 AS is_active, 0 AS open_new_tab, 0 AS is_button UNION ALL
  SELECT 'Our Services', '/services', 2, 1, 0, 0 UNION ALL
  SELECT 'Destinations', '/#destinations', 3, 1, 0, 0 UNION ALL
  SELECT 'Gallery', '/#gallery', 4, 1, 0, 0 UNION ALL
  SELECT 'Google Reviews', '/#reviews', 5, 1, 0, 0 UNION ALL
  SELECT 'Video Testimonials', '/#video-testimonial', 6, 1, 0, 0 UNION ALL
  SELECT 'Contact', '/#contact', 7, 1, 0, 0
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM navigation_items LIMIT 1);

-- 8. Seed additional site settings for dynamic header, footer, SEO & tracking
INSERT IGNORE INTO site_settings (setting_key, setting_value, setting_group) VALUES
  ('header_logo_url', '', 'general'),
  ('header_subheading', 'Career Guidance · Study Abroad', 'general'),
  ('header_cta_label', 'Free Counselling', 'general'),
  ('header_cta_url', '#contact', 'general'),
  ('footer_copyright', '© {year} G3B Education. All rights reserved.', 'general'),
  ('footer_tagline', 'Career Guidance · Psychometric Assessment · Study Abroad', 'general'),
  ('footer_about', 'Career guidance, psychometric assessment, test preparation and end-to-end study abroad support from Nerul, Navi Mumbai.', 'general'),
  ('google_places_api_key', '', 'reviews'),
  ('google_places_place_id', '', 'reviews'),
  ('favicon_url', '/favicon.svg', 'seo'),
  ('og_image_url', '', 'seo'),
  ('og_title', 'G3B Education | Study Abroad & Career Mentorship', 'seo'),
  ('og_description', 'Navigate your global career with certified mentors, IELTS/PTE prep, and university admissions.', 'seo'),
  ('tracking_code_head', '', 'seo'),
  ('tracking_code_body', '', 'seo'),
  ('hero_bg_image_url', '', 'homepage'),
  ('founder_credentials_text', '', 'homepage'),
  ('services_hero_heading', 'Empowering Your Global Journey from Dream to Departure', 'homepage'),
  ('services_hero_subheading', 'Explore our 6-pillar end-to-end support model designed to guide you through career discovery, exam preparation, university admissions, and overseas relocation.', 'homepage');
