CREATE TABLE IF NOT EXISTS universities (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT, slug VARCHAR(180) NOT NULL, name VARCHAR(220) NOT NULL,
 country VARCHAR(100) NOT NULL, city VARCHAR(120) NULL, university_type VARCHAR(80) NULL,
 degree_levels VARCHAR(500) NULL, study_areas TEXT NULL, overview TEXT NULL, entry_requirements TEXT NULL,
 tuition_min DECIMAL(12,2) NULL, tuition_max DECIMAL(12,2) NULL, currency CHAR(3) NULL,
 scholarships_text TEXT NULL, english_requirements TEXT NULL, intakes VARCHAR(500) NULL, deadlines_text TEXT NULL,
 official_url VARCHAR(500) NOT NULL, source_url VARCHAR(500) NOT NULL, last_verified_date DATE NOT NULL,
 image_url VARCHAR(500) NULL, is_featured TINYINT(1) NOT NULL DEFAULT 0, sort_order INT NOT NULL DEFAULT 0,
 is_active TINYINT(1) NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(id), UNIQUE KEY uq_university_slug(slug), KEY idx_university_public(is_active,country,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS programs (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT, university_id INT UNSIGNED NOT NULL, slug VARCHAR(200) NOT NULL,
 name VARCHAR(240) NOT NULL, subject_area VARCHAR(140) NOT NULL, degree_level VARCHAR(100) NOT NULL,
 qualification VARCHAR(140) NULL, campus_location VARCHAR(160) NULL, duration_text VARCHAR(100) NULL, study_mode VARCHAR(80) NULL,
 overview TEXT NULL, curriculum TEXT NULL, learning_outcomes TEXT NULL, entry_requirements TEXT NULL,
 academic_prerequisites TEXT NULL, english_requirements TEXT NULL, tuition_amount DECIMAL(12,2) NULL, currency CHAR(3) NULL,
 additional_costs TEXT NULL, scholarships_text TEXT NULL, intakes VARCHAR(500) NULL, deadlines_text TEXT NULL,
 career_pathways TEXT NULL, official_url VARCHAR(500) NOT NULL, source_url VARCHAR(500) NOT NULL, last_verified_date DATE NOT NULL,
 is_featured TINYINT(1) NOT NULL DEFAULT 0, sort_order INT NOT NULL DEFAULT 0, is_active TINYINT(1) NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(id), UNIQUE KEY uq_program_slug(slug), KEY idx_program_public(is_active,subject_area,degree_level,sort_order),
 CONSTRAINT fk_program_university FOREIGN KEY(university_id) REFERENCES universities(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_university_shortlist (
 student_id INT UNSIGNED NOT NULL, university_id INT UNSIGNED NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(student_id,university_id), CONSTRAINT fk_sus_student FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
 CONSTRAINT fk_sus_university FOREIGN KEY(university_id) REFERENCES universities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_program_shortlist (
 student_id INT UNSIGNED NOT NULL, program_id INT UNSIGNED NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(student_id,program_id), CONSTRAINT fk_sps_student FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
 CONSTRAINT fk_sps_program FOREIGN KEY(program_id) REFERENCES programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_study_preferences (
 student_id INT UNSIGNED NOT NULL, preferred_destinations TEXT NULL, degree_level VARCHAR(100) NULL, subject_interests TEXT NULL,
 budget_amount DECIMAL(12,2) NULL, budget_currency CHAR(3) NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(student_id), CONSTRAINT fk_preferences_student FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
