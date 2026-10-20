import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import env from '../config/env.js';

/**
 * Seed the database with the content supplied in the original G3B Education
 * website. Repeated runs are safe: managed content tables are cleared first.
 * Real user accounts and enquiries are never deleted.
 */

const CONTENT_BLOCKS = [
  {
    key: 'hero',
    heading: 'Study Abroad with Expert Career Guidance & Psychometric Assessment',
    subheading: 'G3B Education – Your Gateway to the Right Career & University',
    body: 'Start with scientific psychometric assessment and expert career guidance to discover your ideal path — then get IELTS/TOEFL/PTE coaching and end-to-end study abroad support for the USA, UK, Canada, Australia, Europe and more.',
    cta_label: 'Start Your Journey',
    cta_url: '#contact',
  },
  {
    key: 'why',
    heading: 'Why Choose G3B Education?',
    subheading: null,
    body: 'At G3B Education, we empower students to unlock their full potential through transformative international education experiences. Our core strength is career guidance backed by scientific psychometric assessment, combined with expert advisors, personalized counselling, and a global network of top-tier universities — so you choose the right course and country with clarity.\n\nOur student-centric approach, unparalleled support services, and proven track record of success set us apart. By choosing G3B Education, you\u2019ll gain access to a world of academic and professional opportunities, and join a community of like-minded individuals who share your passion for global learning and growth.',
    cta_label: null,
    cta_url: null,
  },
  {
    key: 'gallery',
    heading: 'Life at G3B Education',
    subheading: 'Moments that define our students\u2019 journey — from counselling to celebration.',
    body: null,
    cta_label: null,
    cta_url: null,
  },
  {
    key: 'services',
    heading: 'Comprehensive Services for Your Success',
    subheading: 'Everything you need to make your study abroad journey seamless and successful.',
    body: null,
    cta_label: null,
    cta_url: null,
  },
  {
    key: 'destinations',
    heading: 'Study Destinations',
    subheading: 'We open doors to world-class education in top destinations globally.',
    body: null,
    cta_label: null,
    cta_url: null,
  },
  {
    key: 'reviews',
    heading: 'What Students Say on Google',
    subheading: 'Real reviews from our Google Business Profile in Nerul, Navi Mumbai. Click any review to view on Google.',
    body: null,
    cta_label: 'View on Google',
    cta_url: 'https://www.google.com/maps/search/?api=1&query=G3B+Education+Nerul+Navi+Mumbai',
  },
  {
    key: 'videos',
    heading: 'Hear It From Them',
    subheading: 'Real voices sharing their experience with G3B Education. Thank you for trusting us.',
    body: null,
    cta_label: null,
    cta_url: null,
  },
  {
    key: 'process',
    heading: 'Your Pathway to Success',
    subheading: 'Our step-by-step process ensures a seamless journey to your dream university.',
    body: null,
    cta_label: null,
    cta_url: null,
  },
  {
    key: 'career_cta',
    heading: 'Career Guidance & Psychometric Assessment',
    subheading: null,
    body: 'Discover your perfect career path with scientific psychometric assessment and expert guidance from Minal at G3B Career Mentor — the core of how we help students choose the right future.',
    cta_label: 'Take Psychometric Assessment',
    cta_url: 'https://careermentor.g3beducation.com/',
  },
  {
    key: 'contact',
    heading: 'Contact Us',
    subheading: 'Grab this opportunity! Your dream of studying abroad is just a step away.',
    body: null,
    cta_label: 'Send Enquiry',
    cta_url: null,
  },
  {
    key: 'footer',
    heading: null,
    subheading: null,
    body: 'Career Guidance · Psychometric Assessment · Study Abroad',
    cta_label: null,
    cta_url: null,
  },
];

const STATS = [
  { value: '15,000+', label: 'Students Counselled' },
  { value: '500+', label: 'Partner Universities' },
  { value: '10+', label: 'Countries' },
  { value: '98%', label: 'Visa Success Rate' },
];

const WHY_FEATURES = [
  { icon: 'fas fa-brain', text: 'Psychometric assessment & career guidance' },
  { icon: 'fas fa-user-tie', text: 'Expert advisors with personalized guidance' },
  { icon: 'fas fa-globe', text: 'Global network of top-tier universities' },
  { icon: 'fas fa-passport', text: 'End-to-end support from application to visa' },
];

const CERTIFICATIONS = [
  {
    alt_text: 'Minal Kulkarni Certification 1',
    image_url: 'https://images.pexels.com/photos/39296651/pexels-photo-39296651.png?auto=compress&cs=tinysrgb&w=400',
    full_url: 'https://images.pexels.com/photos/39296651/pexels-photo-39296651.png',
  },
  {
    alt_text: 'Minal Kulkarni Certification 2',
    image_url: 'https://images.pexels.com/photos/39296579/pexels-photo-39296579.png?auto=compress&cs=tinysrgb&w=400',
    full_url: 'https://images.pexels.com/photos/39296579/pexels-photo-39296579.png',
  },
  {
    alt_text: 'Minal Kulkarni Certification 3',
    image_url: 'https://images.pexels.com/photos/39296552/pexels-photo-39296552.jpeg?auto=compress&cs=tinysrgb&w=400',
    full_url: 'https://images.pexels.com/photos/39296552/pexels-photo-39296552.jpeg',
  },
];

const SERVICES = [
  {
    title: 'Test Preparation & Language Support',
    description: 'Coaching for IELTS, TOEFL, PTE, GRE and English Speaking with TESOL certified trainers.',
    image_url: 'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&w=600&q=80',
    features: ['8 Full Length Mock Tests', 'Live & Offline Classes', '70+ Module-wise Mock Tests'],
  },
  {
    title: 'Career Guidance & Psychometric Assessment',
    description: 'Scientific psychometric testing and expert career guidance to discover your ideal course, career path and study destination.',
    image_url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=600&q=80',
    features: ['Psychometric Assessment', 'Personalized Career Guidance', 'Course & Career Mapping'],
  },
  {
    title: 'Assistance in University Selection',
    description: 'Help selecting the right university and course based on interests, qualifications & goals.',
    image_url: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
    features: ['500+ Partner Universities', 'Course Matching', 'Budget Planning'],
  },
  {
    title: 'Application & Visa Documentation',
    description: 'SOP, LOR and Visa document support ensuring error-free submissions.',
    image_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=600&q=80',
    features: ['SOP & LOR Assistance', 'Complete Documentation', 'Mock Interviews'],
  },
  {
    title: 'Scholarship & Financial Assistance',
    description: 'Identify scholarships, grants, financial aid and education loan options.',
    image_url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80',
    features: ['Scholarship Guidance', 'Bank Loan Assistance', 'Foreign Exchange Help'],
  },
  {
    title: 'Accommodation & Travel Arrangements',
    description: 'Support for accommodation, flights, SIM, forex and pre-departure orientation.',
    image_url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80',
    features: ['Flight Ticket Booking', 'SIM & Forex Card', 'Pre-Departure Briefing'],
  },
];

const DESTINATIONS = [
  {
    country: 'Australia',
    image_url: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=600&q=80',
    points: [
      '95% globally recognized universities',
      'Scholarships: 10% to 100%',
      'Stay back: 2–5 years',
      '20 hrs/week work rights',
      'Spouse work rights',
    ],
  },
  {
    country: 'United Kingdom',
    image_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
    points: [
      '100+ years academic excellence',
      '1-year Master’s programs',
      '77+ scholarships available',
      '18 months post-study visa',
      'Free NHS healthcare',
    ],
  },
  {
    country: 'United States',
    image_url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=600&q=80',
    points: [
      'Ranked #1 for quality education',
      '1000+ scholarship bodies',
      'STEM excellence & Ivy League',
      'OPT: 3 yrs for STEM',
      '20 hrs/week on-campus work',
    ],
  },
  {
    country: 'Canada',
    image_url: 'https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=600&q=80',
    points: [
      'High-quality affordable education',
      'PR pathways available',
      'Co-op work programs',
      'Multicultural society',
      'Safe, welcoming environment',
    ],
  },
  {
    country: 'Germany',
    image_url: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=600&q=80',
    points: [
      'World’s leading institutions',
      'Best for STEM majors',
      'Low / No tuition fees',
      'Strong research focus',
      '20 hrs/week work rights',
    ],
  },
  {
    country: 'France',
    image_url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
    points: [
      '39 Fortune 500 HQs',
      '5 top European B-schools',
      'Subsidized fees',
      '2 yrs stay back for Master’s',
      'Free French language classes',
    ],
  },
];

const GALLERY = [
  'https://images.pexels.com/photos/39296518/pexels-photo-39296518.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/39296517/pexels-photo-39296517.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/39296516/pexels-photo-39296516.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/39296515/pexels-photo-39296515.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/39296514/pexels-photo-39296514.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/39296513/pexels-photo-39296513.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/39296512/pexels-photo-39296512.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/39261963/pexels-photo-39261963.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/39261962/pexels-photo-39261962.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/39261945/pexels-photo-39261945.jpeg?auto=compress&cs=tinysrgb&w=1200',
];

const GOOGLE_REVIEW_URL = 'https://www.google.com/maps/search/?api=1&query=G3B+Education+Nerul+Navi+Mumbai';

const TESTIMONIALS = [
  {
    author_name: 'Tanmay Pachpande',
    avatar_text: 'TP',
    posted_label: '2 months ago',
    content: 'My experience with G3B Education, particularly with my consultant Minal Kulkarni, has been absolutely outstanding. Minal’s guidance went beyond simply ticking boxes. She helped me meticulously research and decide on the right university and course.',
  },
  {
    author_name: 'Neha Misar',
    avatar_text: 'NM',
    posted_label: '3 months ago',
    content: 'Amazing experience with G3B Education Study Abroad! Their services are top-notch. Especially grateful to Minal Ma’am — the best motivator and counselor — and Mansi Ma’am who treated me like her own younger sister.',
  },
  {
    author_name: 'Zeba Shaikh',
    avatar_text: 'ZS',
    posted_label: '4 months ago',
    content: 'Meeting Minal Kulkarni truly changed my perspective. Thanks to her undying support and belief in me, I chose the path of studying abroad. Her faith motivated me to work harder. Highly recommend her.',
  },
  {
    author_name: 'Dylan Saldana',
    avatar_text: 'DS',
    posted_label: '5 months ago',
    content: 'Incredibly grateful to G3B Education for their guidance throughout my journey to the United States. From shortlisting the right university to visa process and pre-departure formalities — the team was patient and transparent.',
  },
  {
    author_name: 'Parent of Student',
    avatar_text: 'RP',
    posted_label: '6 months ago',
    content: 'Sincerely thank G3B Education for processing my son’s admission for further studies abroad. The team has been professional, patient and efficient at every step. Highly recommend their services.',
  },
  {
    author_name: 'Ananya K.',
    avatar_text: 'AK',
    posted_label: '1 month ago',
    content: 'Excellent coaching for IELTS and complete support for university applications. The mock tests and personal attention from the trainers made a huge difference in my band score. Very happy with the results!',
  },
];

const VIDEOS = [
  {
    title: 'What Parents Say',
    youtube_id: 'fET2RhoejWA',
    youtube_url: 'https://youtu.be/fET2RhoejWA',
    orientation: 'landscape',
  },
  {
    title: 'Student Review',
    youtube_id: 'fJZ25VAibt8',
    youtube_url: 'https://youtube.com/shorts/fJZ25VAibt8',
    orientation: 'portrait',
  },
];

const PROCESS_STEPS = [
  {
    step_number: 1,
    title: 'Career Guidance',
    description: 'Psychometric assessment & one-on-one counselling to map goals, strengths and career path',
    badge: '30–60 mins',
    icon: 'fas fa-comments',
  },
  {
    step_number: 2,
    title: 'Test Preparation',
    description: 'IELTS, TOEFL, PTE, GRE, GMAT coaching with TESOL certified trainers & 8+ mock tests',
    badge: 'TESOL Trainers',
    icon: 'fas fa-book-open',
  },
  {
    step_number: 3,
    title: 'University Shortlisting',
    description: 'Expert selection based on your profile, interests, qualifications & career goals',
    badge: '500+ Universities',
    icon: 'fas fa-university',
  },
  {
    step_number: 4,
    title: 'Application & Docs',
    description: 'SOP, LOR assistance & complete application support ensuring error-free submissions',
    badge: 'Error-free',
    icon: 'fas fa-file-alt',
  },
  {
    step_number: 5,
    title: 'Visa & Pre-Departure',
    description: 'End-to-end visa guidance, mock interviews, accommodation & travel arrangements',
    badge: '98% Success',
    icon: 'fas fa-plane-departure',
  },
];

const ENQUIRY_OPTIONS = [
  'IELTS / TOEFL / PTE Coaching',
  'Study Abroad Counselling',
  'University Application',
  'Visa Assistance',
  'Career Guidance & Psychometric Assessment',
  'Other',
];

const SETTINGS = [
  { key: 'brand_name', value: 'G3B Education', group: 'general' },
  { key: 'hero_badge', value: 'Career Guidance · Psychometric Assessment · Study Abroad', group: 'homepage' },
  { key: 'hero_cta_career_label', value: 'Career Mentor', group: 'homepage' },
  { key: 'hero_cta_career_url', value: 'https://careermentor.g3beducation.com/', group: 'homepage' },
  { key: 'hero_cta_services_label', value: 'Explore Services', group: 'homepage' },
  { key: 'hero_cta_services_url', value: '#services', group: 'homepage' },
  { key: 'founder_name', value: 'Minal Kulkarni', group: 'homepage' },
  { key: 'founder_role', value: 'Founder, G3B Education', group: 'homepage' },
  {
    key: 'founder_image_url',
    value: 'https://images.pexels.com/photos/39014435/pexels-photo-39014435.jpeg?auto=compress&cs=tinysrgb&w=900',
    group: 'homepage',
  },
  { key: 'founder_image_alt', value: 'Minal Kulkarni, Founder', group: 'homepage' },
  { key: 'certifications_heading', value: 'Certifications & Credentials', group: 'homepage' },
  { key: 'contact_office_heading', value: 'Head Office', group: 'contact' },
  {
    key: 'contact_address',
    value: 'G3B Education, 207, Om Sai Datta Niwas,\nPlot A32, Sector 20, Nerul West,\nNavi Mumbai 400706, Maharashtra, India',
    group: 'contact',
  },
  { key: 'contact_phone', value: '8928659569', group: 'contact' },
  { key: 'contact_phone_link', value: '+918928659569', group: 'contact' },
  { key: 'contact_email', value: 'admissions.g3beducation@gmail.com', group: 'contact' },
  { key: 'working_hours', value: 'Mon – Sat: 10:00 AM – 7:00 PM', group: 'contact' },
  { key: 'google_review_url', value: GOOGLE_REVIEW_URL, group: 'reviews' },
  { key: 'google_rating', value: '5.0', group: 'reviews' },
  { key: 'google_review_count', value: '38', group: 'reviews' },
  { key: 'career_mentor_url', value: 'https://careermentor.g3beducation.com/', group: 'general' },
  { key: 'seo_title', value: 'G3B Education | Study Abroad, Career Guidance & Psychometric Assessment', group: 'seo' },
  {
    key: 'seo_description',
    value:
      'G3B Education in Nerul, Navi Mumbai offers career guidance, psychometric assessment, IELTS/TOEFL/PTE coaching and end-to-end study abroad support for the USA, UK, Canada, Australia, Germany and France.',
    group: 'seo',
  },
  {
    key: 'seo_keywords',
    value: 'study abroad, career guidance, psychometric assessment, IELTS coaching, Navi Mumbai, G3B Education',
    group: 'seo',
  },
];

async function clearContentTables(connection) {
  const tables = [
    'destination_points',
    'destinations',
    'service_features',
    'services',
    'gallery_images',
    'testimonials',
    'video_testimonials',
    'process_steps',
    'content_blocks',
    'stats',
    'why_features',
    'certifications',
    'enquiry_options',
    'social_links',
    'site_settings',
  ];
  for (const table of tables) {
    await connection.query(`DELETE FROM ${table}`);
    await connection.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
  }
}

async function ensureAdmin(connection, log) {
  const [rows] = await connection.query('SELECT id FROM users WHERE email = ?', [env.admin.email]);
  if (rows.length > 0) {
    log(`[seed] administrator ${env.admin.email} already exists (password unchanged).`);
    return;
  }

  const passwordHash = await bcrypt.hash(env.admin.password, 12);
  await connection.query(
    'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
    [env.admin.name, env.admin.email, passwordHash, 'admin', 'active'],
  );
  log(`[seed] created administrator ${env.admin.email}`);
  if (env.admin.password === 'ChangeMe123!') {
    log('[seed] WARNING: using the default administrator password. Change it after first login.');
  }
}

export async function seedDatabase({ log = console.log } = {}) {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    multipleStatements: true,
  });

  try {
    await clearContentTables(connection);

    // Content blocks --------------------------------------------------------
    for (const block of CONTENT_BLOCKS) {
      await connection.query(
        `INSERT INTO content_blocks (block_key, heading, subheading, body, cta_label, cta_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [block.key, block.heading, block.subheading, block.body, block.cta_label, block.cta_url],
      );
    }

    // Stats / features / certifications ------------------------------------
    for (const [index, stat] of STATS.entries()) {
      await connection.query('INSERT INTO stats (value, label, sort_order) VALUES (?, ?, ?)', [
        stat.value,
        stat.label,
        index,
      ]);
    }

    for (const [index, feature] of WHY_FEATURES.entries()) {
      await connection.query('INSERT INTO why_features (icon, text, sort_order) VALUES (?, ?, ?)', [
        feature.icon,
        feature.text,
        index,
      ]);
    }

    for (const [index, cert] of CERTIFICATIONS.entries()) {
      await connection.query(
        'INSERT INTO certifications (alt_text, image_url, full_url, sort_order) VALUES (?, ?, ?, ?)',
        [cert.alt_text, cert.image_url, cert.full_url, index],
      );
    }

    // Services --------------------------------------------------------------
    for (const [index, service] of SERVICES.entries()) {
      const [result] = await connection.query(
        'INSERT INTO services (title, description, image_url, sort_order) VALUES (?, ?, ?, ?)',
        [service.title, service.description, service.image_url, index],
      );
      for (const [featureIndex, feature] of service.features.entries()) {
        await connection.query(
          'INSERT INTO service_features (service_id, text, sort_order) VALUES (?, ?, ?)',
          [result.insertId, feature, featureIndex],
        );
      }
    }

    // Destinations ----------------------------------------------------------
    for (const [index, destination] of DESTINATIONS.entries()) {
      const [result] = await connection.query(
        'INSERT INTO destinations (country, image_url, sort_order) VALUES (?, ?, ?)',
        [destination.country, destination.image_url, index],
      );
      for (const [pointIndex, point] of destination.points.entries()) {
        await connection.query(
          'INSERT INTO destination_points (destination_id, text, sort_order) VALUES (?, ?, ?)',
          [result.insertId, point, pointIndex],
        );
      }
    }

    // Gallery ---------------------------------------------------------------
    for (const [index, url] of GALLERY.entries()) {
      await connection.query('INSERT INTO gallery_images (alt_text, image_url, sort_order) VALUES (?, ?, ?)', [
        `G3B Education moment ${index + 1}`,
        url,
        index,
      ]);
    }

    // Testimonials ----------------------------------------------------------
    for (const [index, testimonial] of TESTIMONIALS.entries()) {
      await connection.query(
        `INSERT INTO testimonials
           (author_name, avatar_text, content, rating, source, source_url, posted_label, sort_order)
         VALUES (?, ?, ?, ?, 'google', ?, ?, ?)`,
        [
          testimonial.author_name,
          testimonial.avatar_text,
          testimonial.content,
          5,
          GOOGLE_REVIEW_URL,
          testimonial.posted_label,
          index,
        ],
      );
    }

    // Video testimonials ----------------------------------------------------
    for (const [index, video] of VIDEOS.entries()) {
      await connection.query(
        `INSERT INTO video_testimonials (title, youtube_id, youtube_url, orientation, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
        [video.title, video.youtube_id, video.youtube_url, video.orientation, index],
      );
    }

    // Process steps ---------------------------------------------------------
    for (const [index, step] of PROCESS_STEPS.entries()) {
      await connection.query(
        `INSERT INTO process_steps (step_number, title, description, badge, icon, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [step.step_number, step.title, step.description, step.badge, step.icon, index],
      );
    }

    // Enquiry form options --------------------------------------------------
    for (const [index, label] of ENQUIRY_OPTIONS.entries()) {
      await connection.query('INSERT INTO enquiry_options (label, sort_order) VALUES (?, ?)', [label, index]);
    }

    // Settings --------------------------------------------------------------
    for (const setting of SETTINGS) {
      await connection.query(
        'INSERT INTO site_settings (setting_key, setting_value, setting_group) VALUES (?, ?, ?)',
        [setting.key, setting.value, setting.group],
      );
    }

    await ensureAdmin(connection, log);

    log('[seed] content seeded successfully.');
  } finally {
    await connection.end();
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  try {
    await seedDatabase();
    process.exit(0);
  } catch (error) {
    console.error('[seed] failed:', error.message);
    process.exit(1);
  }
}
