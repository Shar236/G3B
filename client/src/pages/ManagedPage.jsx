import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client.js'
import { useSiteContent } from '../components/layout/PublicLayout.jsx'
import ConsultationForm from '../components/ui/ConsultationForm.jsx'
import useDocumentMeta from '../hooks/useDocumentMeta.js'
import './managed-page.css'
import { visibleHomepageSections } from '../../../shared/publicContentPolicy.js'

const safeUrl = (value) => {
  const url = String(value || '').trim()
  if (url.includes('\\') || [...url].some((character) => character.charCodeAt(0) <= 32) || url.startsWith('//')) return ''
  return url.startsWith('/') || url.startsWith('#') || /^https:\/\//i.test(url) ? url : ''
}
const Heading = ({ level, children }) => {
  if (level === 'h1') return <h1>{children}</h1>
  if (level === 'h3') return <h3>{children}</h3>
  if (level === 'h4') return <h4>{children}</h4>
  return <h2>{children}</h2>
}

export default function ManagedPage({ page }) {
  const { data } = useSiteContent()
  const seo = page.seo || {}
  useDocumentMeta({
    title: seo.seoTitle || `${page.name} | G3B Education`,
    description: seo.metaDescription,
    canonical: seo.canonicalUrl || page.canonical,
    robots: seo.metaRobots,
    image: seo.ogImage,
    jsonLd: seo.structuredData,
    ogTitle: seo.ogTitle,
    ogDescription: seo.ogDescription,
  })
  const sourceSections = page.route === '/' ? visibleHomepageSections(page.sections || []) : page.sections || []
  const sections = [...sourceSections].sort((a, b) => a.sortOrder - b.sortOrder)
  const hasH1 = sections.some((section) => section.headingLevel === 'h1')
  return <div className="managed-page">
    {!hasH1 ? <header className="managed-page-title container"><h1>{page.name}</h1></header> : null}
    {sections.map((section, index) => {
      const hero = section.sectionKey === 'hero' || section.headingLevel === 'h1'
      const form = section.sectionKey.startsWith('form')
      const target = safeUrl(section.ctaUrl)
      return <section key={section.sectionKey} className={hero ? 'managed-section managed-hero' : 'managed-section'} id={section.sectionKey}>
        <div className={section.imageUrl ? 'container managed-section-grid' : 'container'}>
          <div>
            {section.label ? <span className="g3b-eyebrow">{section.label}</span> : null}
            {section.headingText ? <Heading level={section.headingLevel || (hero && hasH1 && index === 0 ? 'h1' : 'h2')}>{section.headingText}</Heading> : null}
            {section.description ? <p>{section.description}</p> : null}
            {target && section.ctaLabel ? target.startsWith('https://') ? <a className="btn btn-primary" href={target} rel="noopener noreferrer">{section.ctaLabel}</a> : <Link className="btn btn-primary" to={target}>{section.ctaLabel}</Link> : null}
          </div>
          {section.imageUrl ? <figure><img src={resolveMediaUrl(section.imageUrl)} alt={section.imageAlt || ''} loading={hero ? 'eager' : 'lazy'} width={720} height={480} />{section.imageCaption ? <figcaption>{section.imageCaption}</figcaption> : null}</figure> : null}
          {form ? <div className="managed-form"><ConsultationForm options={data?.enquiryOptions || []} destinations={data?.destinations || []} theme="light" /></div> : null}
        </div>
      </section>
    })}
    {!sections.length ? <section className="container managed-empty"><h2>Content is being prepared</h2><p>Please check back soon.</p></section> : null}
  </div>
}
