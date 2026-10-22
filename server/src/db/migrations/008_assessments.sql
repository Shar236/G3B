CREATE TABLE IF NOT EXISTS assessment_listings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(200) NOT NULL,
  category ENUM('student','professional','insights') NOT NULL,
  audience VARCHAR(300) NOT NULL,
  summary TEXT NOT NULL,
  purpose TEXT NULL,
  prerequisites TEXT NULL,
  deliverables TEXT NULL,
  icon VARCHAR(80) NULL,
  image_url VARCHAR(500) NULL,
  access_mode ENUM('request','external') NOT NULL DEFAULT 'request',
  launch_url VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_assessment_slug (slug),
  KEY idx_assessment_catalog (category, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_assessments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  assessment_id INT UNSIGNED NOT NULL,
  status ENUM('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
  progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
  recommendation TEXT NULL,
  report_file_name VARCHAR(255) NULL,
  report_original_name VARCHAR(255) NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_assessment (student_id, assessment_id),
  KEY idx_assessment_status (status, updated_at),
  CONSTRAINT fk_student_assessments_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_assessments_listing FOREIGN KEY (assessment_id) REFERENCES assessment_listings(id) ON DELETE RESTRICT,
  CONSTRAINT chk_assessment_progress CHECK (progress_percent BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO assessment_listings (slug,title,category,audience,summary,purpose,deliverables,icon,sort_order,is_active) VALUES
('student-direction-profile','Student Direction Profile','student','School students exploring subjects, streams or future pathways','A guided starting point for discussing learning preferences, interests and possible academic directions.','Support a structured counselling conversation without treating assessment results as a prediction.','Personalised assessment summary\nAreas for further exploration\nCounsellor-led next-step discussion','fas fa-user-graduate',10,1),
('subject-stream-exploration','Subject & Stream Exploration','student','Students approaching subject or stream decisions','Explore aptitude, interests and learning preferences alongside academic context.','Help students compare suitable subject combinations and questions to investigate further.','Strength and interest themes\nSubject exploration prompts\nSuggested counselling questions','fas fa-book-open',20,1),
('professional-alignment-review','Professional Alignment Review','professional','Graduates, working professionals and career changers','Reflect on competencies, workstyle, motivations and possible development directions.','Create a grounded starting point for role exploration, career transition or further study planning.','Professional strengths summary\nWorkstyle discussion points\nDevelopment and exploration priorities','fas fa-briefcase',30,1),
('aptitude-personality-insights','Aptitude & Personality Insights','insights','Students and professionals seeking greater self-awareness','Bring aptitude, interests and preferences into one interpreted profile.','Provide guidance evidence for academic and career conversations, not a guarantee of future outcomes.','Aptitude-area overview\nPreference and motivation themes\nQuestions for guided interpretation','fas fa-brain',40,1)
ON DUPLICATE KEY UPDATE title=VALUES(title);
