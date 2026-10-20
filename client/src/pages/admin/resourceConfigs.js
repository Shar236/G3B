/**
 * Single source of truth describing every manageable content resource.
 * Shared by the admin navigation, the router and the generic CRUD screen so
 * adding a resource only needs one entry here.
 */

const numberField = (name, label) => ({
  name,
  label,
  type: 'number',
  min: 0,
  hint: 'Lower numbers appear first.',
})

const activeField = { name: 'isActive', label: 'Visible on the website', type: 'checkbox' }

export const resourceConfigs = {
  navigation: {
    slug: 'navigation',
    route: 'navigation',
    label: 'Navigation Menu',
    singular: 'Menu Item',
    icon: 'fas fa-compass',
    description: 'Dynamic header navigation items, labels, links and custom CTA buttons.',
    listColumns: [
      { name: 'label', label: 'Label' },
      { name: 'url', label: 'URL / Anchor' },
      { name: 'sortOrder', label: 'Order' },
      { name: 'isButton', label: 'Button', render: (row) => (row.isButton ? 'CTA' : 'Link') },
      { name: 'isActive', label: 'Visible', render: (row) => (row.isActive ? 'Yes' : 'No') },
    ],
    fields: [
      { name: 'label', label: 'Menu label', type: 'text', required: true, placeholder: 'Our Services' },
      { name: 'url', label: 'Link / Anchor', type: 'text', required: true, placeholder: '/services or /#why', hint: 'Use /services for full page, or /#section for homepage smooth scroll.' },
      numberField('sortOrder', 'Display order'),
      { name: 'openNewTab', label: 'Open link in new browser tab', type: 'checkbox' },
      { name: 'isButton', label: 'Style as highlighted CTA button', type: 'checkbox' },
      activeField,
    ],
  },

  services: {
    slug: 'services',
    route: 'services',
    label: 'Services',
    singular: 'Service',
    icon: 'fas fa-briefcase',
    description: 'Comprehensive services for study abroad, coaching packages, pricing, and FAQs.',
    listColumns: [
      { name: 'title', label: 'Title' },
      { name: 'badge', label: 'Badge' },
      { name: 'features', label: 'Features', render: (row) => `${row.features?.length ?? 0} points` },
      { name: 'packages', label: 'Packages', render: (row) => `${row.packages?.length ?? 0} tiers` },
      { name: 'sortOrder', label: 'Order' },
      { name: 'isActive', label: 'Visible', render: (row) => (row.isActive ? 'Yes' : 'No') },
    ],
    fields: [
      { name: 'title', label: 'Service title', type: 'text', required: true, col: 'full' },
      { name: 'slug', label: 'URL slug (e.g. test-preparation)', type: 'text', placeholder: 'test-preparation' },
      { name: 'badge', label: 'Feature badge', type: 'text', placeholder: 'TESOL Certified Faculty' },
      { name: 'subtitle', label: 'Subtitle / Tagline', type: 'text', col: 'full', placeholder: 'Crack IELTS, TOEFL, PTE & GRE' },
      { name: 'icon', label: 'Font Awesome icon class', type: 'text', placeholder: 'fas fa-language' },
      { name: 'imageUrl', label: 'Header / Card Image', type: 'image', col: 'full' },
      { name: 'description', label: 'Overview description', type: 'textarea', col: 'full' },
      {
        name: 'features',
        label: 'Feature bullet points',
        type: 'list',
        col: 'full',
        hint: 'One bullet point per line.',
      },
      {
        name: 'packages',
        label: 'Coaching Packages / Programs (JSON)',
        type: 'json',
        col: 'full',
        placeholder: '[{"name": "Masterclass", "duration": "8 Wks", "badge": "Popular", "features": ["Mock tests", "Daily speaking"]}]',
        hint: 'Array of coaching packages with name, duration, badge, and features list.',
      },
      {
        name: 'pricing',
        label: 'Pricing / Options Tiers (JSON)',
        type: 'json',
        col: 'full',
        placeholder: '[{"tier": "Comprehensive", "highlight": true, "description": "Full end-to-end support"}]',
        hint: 'Array of pricing options or fee details (if applicable).',
      },
      {
        name: 'trainers',
        label: 'Mentors & Trainers (JSON)',
        type: 'json',
        col: 'full',
        placeholder: '[{"name": "Minal Kulkarni", "title": "Lead Consultant", "credentials": "TESOL Certified"}]',
        hint: 'Array of mentor profiles handling this service.',
      },
      {
        name: 'faqs',
        label: 'Frequently Asked Questions (JSON)',
        type: 'json',
        col: 'full',
        placeholder: '[{"q": "How many mocks?", "a": "8 full simulated mocks."}]',
        hint: 'Array of Q&A accordion items for this service.',
      },
      { name: 'ctaLabel', label: 'Action Button Label', type: 'text', placeholder: 'Book Counselling for this Service' },
      numberField('sortOrder', 'Display order'),
      activeField,
    ],
  },

  destinations: {
    slug: 'destinations',
    route: 'destinations',
    label: 'Destinations',
    singular: 'Destination',
    icon: 'fas fa-earth-americas',
    description: 'Study destination cards, work rights, stay-back times, tuition metrics and highlight points.',
    listColumns: [
      { name: 'country', label: 'Country' },
      { name: 'flagIcon', label: 'Flag' },
      { name: 'stayBackTime', label: 'Stay Back' },
      { name: 'points', label: 'Points', render: (row) => `${row.points?.length ?? 0} points` },
      { name: 'sortOrder', label: 'Order' },
      { name: 'isActive', label: 'Visible', render: (row) => (row.isActive ? 'Yes' : 'No') },
    ],
    fields: [
      { name: 'country', label: 'Country name', type: 'text', required: true },
      { name: 'flagIcon', label: 'Flag emoji or icon', type: 'text', placeholder: '🇦🇺' },
      { name: 'stayBackTime', label: 'Post-study stay back duration', type: 'text', placeholder: '2 to 5 Years Post-Study Work Visa' },
      { name: 'workRights', label: 'Student work rights', type: 'text', placeholder: '48 hrs/fortnight during study' },
      { name: 'currencySymbol', label: 'Currency symbol', type: 'text', placeholder: 'AUD $' },
      { name: 'avgTuition', label: 'Average annual tuition', type: 'text', placeholder: 'AUD $22,000 – $42,000 / year' },
      { name: 'detailLink', label: 'Detail page / anchor link', type: 'text', placeholder: '/#contact' },
      { name: 'imageUrl', label: 'Destination Image', type: 'image', col: 'full' },
      { name: 'description', label: 'Country summary', type: 'textarea', col: 'full' },
      { name: 'points', label: 'Key highlights & bullet points', type: 'list', col: 'full', hint: 'One point per line.' },
      numberField('sortOrder', 'Display order'),
      activeField,
    ],
  },

  gallery: {
    slug: 'gallery',
    route: 'gallery',
    label: 'Gallery',
    singular: 'Gallery image',
    icon: 'fas fa-images',
    description: 'Images used in the "Life at G3B Education" photo gallery.',
    listColumns: [
      { name: 'imageUrl', label: 'Preview', render: (row) => row.imageUrl, image: true },
      { name: 'altText', label: 'Alt text' },
      { name: 'caption', label: 'Caption' },
      { name: 'sortOrder', label: 'Order' },
      { name: 'isActive', label: 'Visible', render: (row) => (row.isActive ? 'Yes' : 'No') },
    ],
    fields: [
      { name: 'altText', label: 'Alt text', type: 'text', required: true, col: 'full', hint: 'Describe the image for accessibility.' },
      { name: 'caption', label: 'Caption / Description', type: 'text', col: 'full', placeholder: 'Students celebrating university admissions' },
      { name: 'category', label: 'Category tag', type: 'text', placeholder: 'Life at G3B' },
      { name: 'imageUrl', label: 'Image', type: 'image', required: true, col: 'full' },
      numberField('sortOrder', 'Display order'),
      activeField,
    ],
  },

  testimonials: {
    slug: 'testimonials',
    route: 'testimonials',
    label: 'Testimonials',
    singular: 'Testimonial',
    icon: 'fas fa-star',
    description: 'Google reviews and written testimonials shown on the website.',
    listColumns: [
      { name: 'authorName', label: 'Author' },
      { name: 'content', label: 'Review', render: (row) => `${row.content?.slice(0, 70) ?? ''}…` },
      { name: 'rating', label: 'Rating' },
      { name: 'isActive', label: 'Visible', render: (row) => (row.isActive ? 'Yes' : 'No') },
    ],
    fields: [
      { name: 'authorName', label: 'Author name', type: 'text', required: true },
      { name: 'avatarText', label: 'Avatar initials', type: 'text', hint: 'Shown inside the round avatar, e.g. TP.' },
      { name: 'authorRole', label: 'Author role / designation', type: 'text', placeholder: 'Student, University of Melbourne' },
      {
        name: 'rating',
        label: 'Rating (1-5)',
        type: 'number',
        min: 1,
        max: 5,
      },
      { name: 'content', label: 'Review text', type: 'textarea', required: true, col: 'full' },
      {
        name: 'source',
        label: 'Source',
        type: 'select',
        options: [
          { value: 'google', label: 'Google review' },
          { value: 'website', label: 'Website testimonial' },
        ],
      },
      { name: 'sourceUrl', label: 'Source URL', type: 'text', placeholder: 'https://…', col: 'full' },
      { name: 'postedLabel', label: 'Posted label', type: 'text', placeholder: '2 months ago' },
      numberField('sortOrder', 'Display order'),
      activeField,
    ],
  },

  videos: {
    slug: 'videos',
    route: 'videos',
    label: 'Video Testimonials',
    singular: 'Video',
    icon: 'fas fa-video',
    description: 'YouTube and Vimeo testimonials with category tabs and live previews.',
    listColumns: [
      { name: 'title', label: 'Title' },
      { name: 'category', label: 'Category' },
      { name: 'youtubeId', label: 'Video ID' },
      { name: 'orientation', label: 'Orientation' },
      { name: 'isActive', label: 'Visible', render: (row) => (row.isActive ? 'Yes' : 'No') },
    ],
    fields: [
      { name: 'title', label: 'Video title', type: 'text', required: true },
      { name: 'category', label: 'Category / Tab name', type: 'text', placeholder: 'What Parents Say or Student Review' },
      { name: 'studentName', label: 'Speaker name', type: 'text', placeholder: 'Parent of Student / Alumni' },
      { name: 'destinationCountry', label: 'Destination country', type: 'text', placeholder: 'UK & USA' },
      { name: 'youtubeId', label: 'Video ID (detected automatically)', type: 'text', hint: 'Paste the video URL below; the provider and ID are detected automatically.' },
      { name: 'youtubeUrl', label: 'YouTube or Vimeo URL', type: 'text', required: true, col: 'full', placeholder: 'https://youtu.be/…' },
      {
        name: 'orientation',
        label: 'Orientation',
        type: 'select',
        options: [
          { value: 'landscape', label: 'Landscape (16:9)' },
          { value: 'portrait', label: 'Portrait / Shorts (9:16)' },
        ],
      },
      numberField('sortOrder', 'Display order'),
      activeField,
    ],
  },

  'process-steps': {
    slug: 'process-steps',
    route: 'process-steps',
    label: 'Process Steps',
    singular: 'Step',
    icon: 'fas fa-list-ol',
    description: 'The "Your Pathway to Success" step-by-step milestone flow.',
    listColumns: [
      { name: 'stepNumber', label: '#' },
      { name: 'title', label: 'Title' },
      { name: 'badge', label: 'Badge' },
      { name: 'isActive', label: 'Visible', render: (row) => (row.isActive ? 'Yes' : 'No') },
    ],
    fields: [
      { name: 'stepNumber', label: 'Step number', type: 'number', required: true, min: 1 },
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea', col: 'full' },
      { name: 'badge', label: 'Badge label', type: 'text', placeholder: '30–60 mins' },
      { name: 'icon', label: 'Font Awesome icon class', type: 'text', placeholder: 'fas fa-comments' },
      numberField('sortOrder', 'Display order'),
      activeField,
    ],
  },

  stats: {
    slug: 'stats',
    route: 'stats',
    label: 'Statistics',
    singular: 'Statistic',
    icon: 'fas fa-chart-simple',
    description: 'Hero and landing statistics counters (e.g. 15,000+ Students, 98% Visa Success).',
    listColumns: [
      { name: 'value', label: 'Value' },
      { name: 'label', label: 'Label' },
      { name: 'sortOrder', label: 'Order' },
      { name: 'isActive', label: 'Visible', render: (row) => (row.isActive ? 'Yes' : 'No') },
    ],
    fields: [
      { name: 'value', label: 'Value', type: 'text', required: true, placeholder: '15,000+' },
      { name: 'label', label: 'Label', type: 'text', required: true, placeholder: 'Students Counselled' },
      numberField('sortOrder', 'Display order'),
      activeField,
    ],
  },

  'why-features': {
    slug: 'why-features',
    route: 'why-features',
    label: 'Why Choose Features',
    singular: 'Feature',
    icon: 'fas fa-circle-check',
    description: 'Highlight feature points in the "Why Choose G3B Education" section.',
    listColumns: [
      { name: 'text', label: 'Feature' },
      { name: 'icon', label: 'Icon' },
      { name: 'isActive', label: 'Visible', render: (row) => (row.isActive ? 'Yes' : 'No') },
    ],
    fields: [
      { name: 'text', label: 'Feature text', type: 'text', required: true, col: 'full' },
      { name: 'icon', label: 'Font Awesome icon class', type: 'text', placeholder: 'fas fa-brain' },
      numberField('sortOrder', 'Display order'),
      activeField,
    ],
  },

  certifications: {
    slug: 'certifications',
    route: 'certifications',
    label: 'Certifications',
    singular: 'Certification',
    icon: 'fas fa-certificate',
    description: 'Founder certifications and professional credentials grid.',
    listColumns: [
      { name: 'imageUrl', label: 'Preview', render: (row) => row.imageUrl, image: true },
      { name: 'altText', label: 'Alt text' },
      { name: 'isActive', label: 'Visible', render: (row) => (row.isActive ? 'Yes' : 'No') },
    ],
    fields: [
      { name: 'altText', label: 'Alt text', type: 'text', required: true, col: 'full' },
      { name: 'imageUrl', label: 'Thumbnail Image', type: 'image', required: true, col: 'full' },
      { name: 'fullUrl', label: 'Full-size Image URL (on click)', type: 'text', col: 'full', placeholder: 'Opened when a visitor clicks the thumbnail' },
      numberField('sortOrder', 'Display order'),
      activeField,
    ],
  },

  'enquiry-options': {
    slug: 'enquiry-options',
    route: 'enquiry-options',
    label: 'Enquiry Options',
    singular: 'Option',
    icon: 'fas fa-list',
    description: 'Options shown in the "Interested In" dropdown of the Free Counselling form.',
    listColumns: [
      { name: 'label', label: 'Option' },
      { name: 'sortOrder', label: 'Order' },
      { name: 'isActive', label: 'Visible', render: (row) => (row.isActive ? 'Yes' : 'No') },
    ],
    fields: [
      { name: 'label', label: 'Option label', type: 'text', required: true, col: 'full' },
      numberField('sortOrder', 'Display order'),
      activeField,
    ],
  },

  'social-links': {
    slug: 'social-links',
    route: 'social-links',
    label: 'Social Links',
    singular: 'Social link',
    icon: 'fas fa-share-nodes',
    description: 'Social profile links and icons displayed in the website footer.',
    listColumns: [
      { name: 'platform', label: 'Platform' },
      { name: 'url', label: 'URL' },
      { name: 'isActive', label: 'Visible', render: (row) => (row.isActive ? 'Yes' : 'No') },
    ],
    fields: [
      { name: 'platform', label: 'Platform name', type: 'text', required: true, placeholder: 'Facebook' },
      { name: 'url', label: 'Profile URL', type: 'text', required: true, col: 'full', placeholder: 'https://…' },
      { name: 'icon', label: 'Font Awesome icon class', type: 'text', placeholder: 'fab fa-facebook-f' },
      numberField('sortOrder', 'Display order'),
      activeField,
    ],
  },

  faqs: {
    slug: 'faqs',
    route: 'faqs',
    label: 'FAQs',
    singular: 'FAQ',
    icon: 'fas fa-circle-question',
    description: 'Site-wide frequently asked questions shown in the homepage FAQ accordion.',
    listColumns: [
      { name: 'question', label: 'Question' },
      { name: 'category', label: 'Category' },
      { name: 'answer', label: 'Answer', render: (row) => `${row.answer?.slice(0, 60) ?? ''}…` },
      { name: 'sortOrder', label: 'Order' },
      { name: 'isActive', label: 'Visible', render: (row) => (row.isActive ? 'Yes' : 'No') },
    ],
    fields: [
      { name: 'question', label: 'Question', type: 'text', required: true, col: 'full' },
      { name: 'answer', label: 'Answer', type: 'textarea', required: true, col: 'full' },
      { name: 'category', label: 'Category tag', type: 'text', placeholder: 'Visas' },
      numberField('sortOrder', 'Display order'),
      activeField,
    ],
  },
}

export const resourceSlugs = Object.keys(resourceConfigs)

export default resourceConfigs
