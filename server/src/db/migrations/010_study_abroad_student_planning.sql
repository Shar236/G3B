CREATE TABLE IF NOT EXISTS student_program_comparisons (
  student_id INT UNSIGNED NOT NULL,
  program_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(student_id, program_id),
  CONSTRAINT fk_spc_student FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_spc_program FOREIGN KEY(program_id) REFERENCES programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_recent_study_items (
  student_id INT UNSIGNED NOT NULL,
  item_type ENUM('university','program') NOT NULL,
  item_id INT UNSIGNED NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(student_id, item_type, item_id),
  KEY idx_recent_student(student_id, viewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_application_checklist (
  student_id INT UNSIGNED NOT NULL,
  item_key VARCHAR(80) NOT NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(student_id, item_key),
  CONSTRAINT fk_sac_student FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
