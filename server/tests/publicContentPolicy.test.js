import { describe, expect, it } from 'vitest';
import { isRemovedPartnerStatistic, visibleHomepageSections } from '../../shared/publicContentPolicy.js';

describe('retired homepage content', () => {
  it('recognises CMS spelling/case variants of the partner-university statistic', () => {
    for (const label of ['Partner Universities', 'partner_universities', 'University Partners', 'Universities Students Sent To']) {
      expect(isRemovedPartnerStatistic({ label, value: '500+' })).toBe(true);
    }
    expect(isRemovedPartnerStatistic({ label: 'Students counselled', value: '120' })).toBe(false);
  });
  it('removes newsletter sections without deleting data or disabling legitimate enquiry forms', () => {
    const sections = [{ sectionKey: 'hero', headingText: 'Plan your education' }, { sectionKey: 'form-newsletter', headingText: 'Stay informed' }, { sectionKey: 'updates', description: 'Subscribe to our newsletter' }, { sectionKey: 'form-contact', headingText: 'Book counselling' }];
    expect(visibleHomepageSections(sections).map((section) => section.sectionKey)).toEqual(['hero', 'form-contact']);
    expect(sections).toHaveLength(4);
  });
});
