const normalise = (value) => String(value || '').normalize('NFKC').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

export function isRemovedPartnerStatistic(value = {}) {
  const label = normalise([value.label, value.title, value.headingText, value.description, value.body].filter(Boolean).join(' '));
  return /partner\s*universit|universit\w*\s*partner|universit\w*\s*students\s*sent/.test(label);
}

export function isRemovedHomepageSection(section = {}) {
  const identity = normalise([section.sectionKey, section.key, section.label, section.headingText, section.heading, section.description, section.body, section.ctaLabel].filter(Boolean).join(' '));
  return /newsletter|mailing list|subscribe|subscription|receive education updates/.test(identity) || isRemovedPartnerStatistic(section);
}

/** Hide retired public content without deleting the underlying CMS records. */
export function visibleHomepageSections(sections = []) {
  return sections.filter((section) => !isRemovedHomepageSection(section));
}
