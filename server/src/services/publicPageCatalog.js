// Discovery does not create, publish or replace CMS records.
export const publicPageCatalog = [
  ['/', 'Homepage', 'home'], ['/services', 'Services overview', 'services'],
  ['/services/career-counselling', 'Career Counselling', 'service'],
  ['/services/psychometric-assessment', 'Psychometric Assessment', 'service'],
  ['/services/profile-building', 'Student Profile Building', 'service'],
  ['/services/study-abroad', 'Study Abroad Guidance', 'service'],
  ['/services/admissions', 'Admissions Guidance', 'service'],
  ['/services/india-admissions', 'India Admissions', 'service'],
  ['/services/scholarships', 'Scholarship Guidance', 'service'],
  ['/services/visa-guidance', 'Visa Documentation Guidance', 'service'],
  ['/services/pre-departure', 'Pre-departure Support', 'service'],
  ['/services/english-test-preparation', 'English Language Test Preparation', 'service'],
  ['/about/media', 'Media Gallery', 'custom'], ['/about/media/photos', 'Photo Gallery', 'custom'],
  ['/about/media/videos', 'Video Gallery', 'custom'],
].map(([route, name, pageType]) => ({ route, name, pageType }));
