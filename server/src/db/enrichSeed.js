import { query } from '../config/db.js';

export async function enrichData() {
  console.log('[enrich] Updating services with rich packages, FAQs and metadata...');

  const servicesData = [
    {
      title: 'Test Preparation & Language Support',
      slug: 'test-preparation',
      subtitle: 'Crack IELTS, TOEFL, PTE & GRE with TESOL Certified Master Trainers',
      badge: 'TESOL Certified Faculty',
      icon: 'fas fa-language',
      description: 'Comprehensive, structured coaching for IELTS, TOEFL, PTE, GRE, and Spoken English. We provide personalized diagnostic tests, 70+ module-wise mock tests, live interactive feedback, and proven score-maximization strategies tailored to your target universities.',
      packages: [
        {
          name: 'IELTS / PTE Masterclass',
          duration: '6–8 Weeks',
          badge: 'Most Popular',
          features: [
            '8 Full-length timed mock tests with band score analysis',
            '70+ module-wise drills (Reading, Writing, Listening, Speaking)',
            'Daily 1-on-1 speaking interview practice with audio feedback',
            'Personalized essay evaluation & lexical resource training',
            'Flexible weekend & weekday evening batches'
          ]
        },
        {
          name: 'GRE / GMAT Quant & Verbal',
          duration: '10–12 Weeks',
          badge: 'High Impact',
          features: [
            'Extensive quantitative problem sets & shortcuts',
            'Advanced verbal reasoning & reading comprehension mastery',
            'Full sectional tests simulating the real adaptive exam',
            '1-on-1 doubt solving with senior test prep faculty',
            'Official test voucher guidance & date booking assistance'
          ]
        },
        {
          name: 'Spoken English & Business Communication',
          duration: '4 Weeks',
          badge: 'Foundational',
          features: [
            'Accent neutralization & fluency development',
            'Academic presentation & seminar discussion skills',
            'Professional email etiquette & academic writing',
            'Confidence-building debates & group exercises'
          ]
        }
      ],
      pricing: [
        { tier: 'Crash Course (4 Wks)', highlight: false, description: 'Rapid score booster with 4 mock tests and intensive sectional reviews' },
        { tier: 'Comprehensive (8 Wks)', highlight: true, description: 'Complete end-to-end coaching with unlimited speaking sessions and rigorous simulated mock scoring' },
        { tier: '1-on-1 Private Mentoring', highlight: false, description: 'Dedicated personal tutor tailored exclusively to your weak sections and pace' }
      ],
      trainers: [
        { name: 'Minal Kulkarni', title: 'Lead Test Prep Consultant & Founder', credentials: 'TESOL Certified, 15+ Yrs Experience' },
        { name: 'Senior Language Specialist', title: 'IELTS / PTE Master Evaluator', credentials: 'British Council & IDP Certified Faculty' }
      ],
      faqs: [
        { q: 'How many mock tests are included in the IELTS/PTE course?', a: 'You receive 8 full-length simulated mock tests and more than 70 module-wise mock drills with comprehensive band score breakdowns and diagnostic reviews.' },
        { q: 'Can I attend online or in-person at the Nerul center?', a: 'We offer both hybrid flexible learning: live online interactive sessions as well as in-person classroom coaching at our Nerul, Navi Mumbai center.' },
        { q: 'How often are speaking interviews conducted?', a: 'Speaking practice is conducted daily with our certified trainers, simulating real examiner conditions to eliminate hesitation and boost lexical resource and pronunciation.' }
      ]
    },
    {
      title: 'Career Guidance & Psychometric Assessment',
      slug: 'career-guidance',
      subtitle: 'Scientific Psychometric Brain Mapping & Tailored Career Discovery',
      badge: 'Scientific Methodology',
      icon: 'fas fa-brain',
      description: 'Before choosing an overseas course, we help you discover your genuine cognitive strengths, innate personality traits, and long-term career aspirations through scientifically validated psychometric testing and one-on-one mentor counselling.',
      packages: [
        {
          name: 'Comprehensive Psychometric Battery',
          duration: '60–90 Mins Test + 60 Mins Counselling',
          badge: 'Recommended',
          features: [
            'Multi-dimensional aptitude, personality & interest assessment',
            '25+ page in-depth psychometric analytical report',
            '1-on-1 parent and student debriefing session with Minal Kulkarni',
            'Top 5 career cluster mapping based on global job market trends',
            'Course curriculum & university prerequisites alignment'
          ]
        },
        {
          name: 'Stream & Course Selection for 10th/12th Students',
          duration: '2 Weeks Program',
          badge: 'Early Starter',
          features: [
            'Subject stream selection (Science, Commerce, Humanities, Tech)',
            'Future-proof emerging career profiles analysis (AI, Robotics, FinTech, Biotech)',
            'Undergraduate international roadmap planning',
            'Extracurricular profile building strategy'
          ]
        }
      ],
      pricing: [
        { tier: 'Standard Assessment', highlight: false, description: 'Online test + comprehensive 20-page report download' },
        { tier: 'Gold Mentorship', highlight: true, description: 'Assessment + Detailed Report + 1-on-1 deep dive career mapping with Minal Kulkarni' }
      ],
      trainers: [
        { name: 'Minal Kulkarni', title: 'Chief Career Mentor & Psychometrician', credentials: 'Certified Career Counsellor & Psychometric Assessor' }
      ],
      faqs: [
        { q: 'Who should take the Psychometric Assessment?', a: 'High school students (grades 9–12), undergraduate graduates seeking master’s degrees, and early working professionals wanting to pivot careers or study abroad benefit immensely.' },
        { q: 'How does this help in university selection?', a: 'By establishing your personality type and cognitive strengths, we ensure you do not waste years or money studying an incompatible degree in another country.' }
      ]
    },
    {
      title: 'Assistance in University Selection',
      slug: 'university-selection',
      subtitle: 'Data-Driven University Shortlisting Across Top Global Institutions',
      badge: 'Strategic Shortlisting',
      icon: 'fas fa-university',
      description: 'Navigate tens of thousands of programs across the USA, UK, Canada, Australia, Germany, France, and Ireland. We create a balanced, strategic shortlist divided into Ambitious, Target, and Safe institutions matching your academic profile and budget.',
      packages: [
        {
          name: 'Strategic 3-Tier University Shortlisting',
          duration: 'Ongoing Support',
          badge: 'High Acceptance Rate',
          features: [
            'Ambitious, Target, and Safe university segmentation',
            'In-depth tuition fee, living cost & ROI financial analysis',
            'Location suitability, post-study work rights & local industry clusters',
            'Scholarship eligibility audit for institutional grants',
            'Guidance on university entrance criteria & application requirements'
          ]
        }
      ],
      pricing: [
        { tier: 'Admissions Package', highlight: true, description: 'Complete shortlisting of 6–10 institutions with complete application management' }
      ],
      trainers: [
        { name: 'Admissions Advisory Desk', title: 'Global Admissions Mentors', credentials: 'Experienced Global Education Advisors' }
      ],
      faqs: [
        { q: 'How many universities do you shortlist for me?', a: 'We typically shortlist 8 to 12 targeted institutions categorized into Dream, Target, and Safe, ensuring maximum chances of acceptance with optimal scholarship options.' },
        { q: 'Do you help with European public universities with zero tuition?', a: 'Yes! We actively guide students to tuition-free or subsidized public universities in Germany, France, and other top European destinations.' }
      ]
    },
    {
      title: 'Application & Visa Documentation',
      slug: 'visa-documentation',
      subtitle: 'Flawless SOP Drafting, LOR Guidance & 98% Visa Success Strategy',
      badge: '98% Visa Success Rate',
      icon: 'fas fa-passport',
      description: 'Your Statement of Purpose (SOP) and visa interview make or break your admission. Our experienced editors and visa officers guide every draft, verify financial documents, conduct rigorous mock interviews, and ensure 100% embassy compliance.',
      packages: [
        {
          name: 'End-to-End Application & Visa Package',
          duration: 'Application to Visa Stamping',
          badge: 'Zero-Defect Standard',
          features: [
            'Custom SOP ideation, drafting and multi-round editing',
            'Letters of Recommendation (LOR) structure & academic referee guidance',
            'Resume / CV makeover to international academic standards',
            'Financial affidavit & bank sponsorship documentation review',
            '3+ simulated Embassy mock visa interviews with recorded feedback'
          ]
        }
      ],
      pricing: [
        { tier: 'Comprehensive Visa Filing', highlight: true, description: 'Application submission + SOP editing + Embassy file assembly + Mock interviews' }
      ],
      trainers: [
        { name: 'Minal Kulkarni & Visa Team', title: 'Senior Immigration Documentation Specialists', credentials: '98% Document Approval Rate across 15+ Embassies' }
      ],
      faqs: [
        { q: 'Do you write the SOP for me or help me write it?', a: 'We conduct brainstorming questionnaires to extract your genuine unique stories, then collaboratively craft, refine, and polish an authentic, high-impact SOP that university admissions committees love.' },
        { q: 'What happens in the mock visa interview?', a: 'We replicate exact embassy conditions with frequently asked consular questions, counter-queries regarding finances, intent to return, and course rationale.' }
      ]
    },
    {
      title: 'Scholarship & Financial Assistance',
      slug: 'scholarships-financial-aid',
      subtitle: 'Unlock Institutional Grants, Merit Awards & Non-Collateral Education Loans',
      badge: 'Maximizing Aid',
      icon: 'fas fa-hand-holding-dollar',
      description: 'We help you bridge the funding gap. From identifying university merit scholarships ranging from 10% to 100% to connecting you with leading public and private banks for non-collateral overseas education loans with competitive interest rates.',
      packages: [
        {
          name: 'Financial Advisory & Scholarship Portfolio',
          duration: 'Pre-Application to Sanction',
          badge: 'Maximum Savings',
          features: [
            'Search & application for country-specific grants & university scholarships',
            'Tie-ups with leading nationalized & private banks (SBI, HDFC Credila, Avanse)',
            'Non-collateral and collateral loan guidance with expedited sanction letters',
            'Tax exemption advice (80E) and margin money optimization',
            'Best currency exchange rates with verified forex partners'
          ]
        }
      ],
      pricing: [
        { tier: 'Integrated Financial Support', highlight: true, description: 'Included with our full counselling packages with dedicated loan manager' }
      ],
      trainers: [
        { name: 'Financial Aid Advisory Desk', title: 'Education Loan & Forex Specialist', credentials: 'Tie-ups with Top 12 Banking & NBFC Partners' }
      ],
      faqs: [
        { q: 'Can I get an education loan without pledging property or collateral?', a: 'Yes, depending on your target country, university ranking, and co-applicant profile, our banking partners offer unsecured non-collateral loans up to INR 50–75 Lakhs.' },
        { q: 'Are scholarships guaranteed?', a: 'While universities make final award decisions, our strategic shortlisting and scholarship essay mentorship have helped over 85% of our applicants secure merit aid or fee discounts.' }
      ]
    },
    {
      title: 'Accommodation & Travel Arrangements',
      slug: 'pre-departure-travel',
      subtitle: 'Seamless Pre-Departure Briefings, Flights, Forex & Safe Housing',
      badge: 'Complete Peace of Mind',
      icon: 'fas fa-plane-departure',
      description: 'Our commitment does not end with your visa stamp. We guide you through student accommodation booking, discounted student flight tickets with extra baggage allowances, multi-currency forex travel cards, overseas SIM cards, and comprehensive pre-departure briefings.',
      packages: [
        {
          name: 'Departure & Settlement Toolkit',
          duration: 'Post-Visa to Arrival',
          badge: 'Stress-Free Relocation',
          features: [
            'University dorms vs. Private student accommodation (PBSA) shortlisting',
            'Student flight bookings with 40–45kg extra baggage benefits',
            'Zero-markup Multi-Currency Forex Card & international bank account setup',
            'International SIM card with active data before boarding your flight',
            'Pre-departure orientation: customs, culture, part-time jobs & packing checklist'
          ]
        }
      ],
      pricing: [
        { tier: 'Complete Relocation Desk', highlight: true, description: 'All-inclusive travel, accommodation & student concierge' }
      ],
      trainers: [
        { name: 'Pre-Departure Concierge', title: 'Student Welfare & Relocation Team', credentials: 'Dedicated alumni network support in UK, USA, AUS & Canada' }
      ],
      faqs: [
        { q: 'When should I book my student accommodation?', a: 'We recommend initiating accommodation bookings immediately upon receiving your unconditional offer letter or CAS/I-20, as university-adjacent PBSA rooms fill up very fast.' },
        { q: 'Do you connect me with students already studying at my university?', a: 'Yes! We have an active alumni network across the UK, USA, Canada, Australia, and Europe, connecting incoming students for shared accommodation and airport pickups.' }
      ]
    }
  ];

  for (const s of servicesData) {
    await query(
      `UPDATE services 
       SET slug = ?, subtitle = ?, badge = ?, icon = ?, description = ?, 
           packages_json = ?, pricing_json = ?, trainers_json = ?, faqs_json = ?, 
           cta_label = 'Book Counselling for this Service'
       WHERE title = ?`,
      [
        s.slug,
        s.subtitle,
        s.badge,
        s.icon,
        s.description,
        JSON.stringify(s.packages),
        JSON.stringify(s.pricing),
        JSON.stringify(s.trainers),
        JSON.stringify(s.faqs),
        s.title
      ]
    );
  }

  console.log('[enrich] Updating destination metrics (flags, stay-back times, work rights)...');

  const destinationMetrics = [
    {
      country: 'Australia',
      flag: '🇦🇺',
      stayBack: '2 to 5 Years Post-Study Work Visa',
      workRights: '48 hrs/fortnight (Unlimited during breaks)',
      currency: 'AUD $',
      tuition: 'AUD $22,000 – $42,000 / year',
      detailLink: '/#contact'
    },
    {
      country: 'United Kingdom',
      flag: '🇬🇧',
      stayBack: '2 Years Graduate Route (3 Yrs for PhD)',
      workRights: '20 hrs/week during term time',
      currency: 'GBP £',
      tuition: '£13,000 – £28,000 / year',
      detailLink: '/#contact'
    },
    {
      country: 'United States',
      flag: '🇺🇸',
      stayBack: 'Up to 3 Years OPT (STEM Extensions)',
      workRights: '20 hrs/week on-campus',
      currency: 'USD $',
      tuition: '$25,000 – $55,000 / year',
      detailLink: '/#contact'
    },
    {
      country: 'Canada',
      flag: '🇨🇦',
      stayBack: 'Up to 3 Years PGWP (PR Pathways)',
      workRights: '20–24 hrs/week off-campus',
      currency: 'CAD $',
      tuition: 'CAD $18,000 – $36,000 / year',
      detailLink: '/#contact'
    },
    {
      country: 'Germany',
      flag: '🇩🇪',
      stayBack: '18 Months Post-Study Work Permit',
      workRights: '120 full days or 240 half days/year',
      currency: 'EUR €',
      tuition: '€0 (Public) to €15,000 / year',
      detailLink: '/#contact'
    },
    {
      country: 'France',
      flag: '🇫🇷',
      stayBack: '2 Years Stay-Back for Master’s',
      workRights: 'Up to 60% of annual working time',
      currency: 'EUR €',
      tuition: '€2,770 – €14,000 / year',
      detailLink: '/#contact'
    }
  ];

  for (const d of destinationMetrics) {
    await query(
      `UPDATE destinations 
       SET flag_icon = ?, stay_back_time = ?, work_rights = ?, currency_symbol = ?, avg_tuition = ?, detail_link = ?
       WHERE country = ?`,
      [d.flag, d.stayBack, d.workRights, d.currency, d.tuition, d.detailLink, d.country]
    );
  }

  console.log('[enrich] Updating video testimonials with category tags...');
  await query(`UPDATE video_testimonials SET category = 'What Parents Say', student_name = 'Parent of Student', destination_country = 'UK & USA' WHERE id = 1`);
  await query(`UPDATE video_testimonials SET category = 'Student Review', student_name = 'International Student', destination_country = 'Australia' WHERE id = 2`);

  console.log('[enrich] Enrichment completed successfully.');
}

if (process.argv[1]?.includes('enrichSeed')) {
  enrichData().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
