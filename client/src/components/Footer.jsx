import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'
import defaultHomeData from '../data/defaultHomeContent.js'

const FOOTER_GROUPS = [
  { title: 'Company', links: [
    ['About G3B Education', '/#why'], ['Why Choose G3B', '/#why'], ['Our Leadership & Team', '/#team'],
    ['Our 3-Stage Approach', '/#approach'], ['Student Success Stories', '/#reviews'], ['Media Gallery', '/about/media'], ['Contact & Visit Us', '/#contact'],
  ] },
  { title: 'Services', links: [
    ['Career Counselling', '/services/career-counselling'], ['Psychometric Assessment', '/services/psychometric-assessment'],
    ['Profile Building', '/services/profile-building'], ['Study Abroad Guidance', '/services/study-abroad'],
    ['Admissions Guidance', '/services/admissions'], ['Scholarship Guidance', '/services/scholarships'],
    ['Visa Documentation Guidance', '/services/visa-guidance'], ['Pre-departure Support', '/services/pre-departure'],
    ['English Test Preparation', '/services/english-test-preparation'],
  ] },
  { title: 'Resources', links: [
    ['Blogs & Articles', '/insights'], ['Frequently Asked Questions', '/#faqs'], ['Career Guidance Resources', '/#pathways'],
    ['Overseas Education Guide', '/#knowledge-hub'], ['Student Video Reviews', '/#video-testimonial'], ['Student Dashboard', '/student/dashboard'],
  ] },
]

function verifiedSocialLinks(links, phone) {
  const supported = { whatsapp: ['wa.me', 'api.whatsapp.com'], linkedin: ['linkedin.com', 'www.linkedin.com'], instagram: ['instagram.com', 'www.instagram.com'] }
  const icons = { whatsapp: 'fab fa-whatsapp', linkedin: 'fab fa-linkedin-in', instagram: 'fab fa-instagram' }
  const valid = links.filter((link) => {
    try {
      const platform = link.platform?.toLowerCase()
      const url = new URL(link.url)
      return supported[platform]?.includes(url.hostname) && url.protocol === 'https:' && url.pathname !== '/'
    } catch { return false }
  }).map((link) => ({ ...link, icon: icons[link.platform.toLowerCase()] }))
  if (!valid.some((link) => link.platform.toLowerCase() === 'whatsapp')) {
    valid.unshift({ platform: 'WhatsApp', url: `https://wa.me/${phone.replace(/\D/g, '')}`, icon: icons.whatsapp })
  }
  return valid
}

export default function Footer({ settings = {}, content = {}, socialLinks = [], footerLinks = [] }) {
  const brand = settings.brand_name || 'G3B Education'
  const logoUrl = settings.header_logo_url ? resolveMediaUrl(settings.header_logo_url) : '/logo.png'
  const phone = settings.contact_phone || '8928659569'
  const phoneLink = settings.contact_phone_link || (phone.replace(/\D/g, '').length === 10 ? `+91${phone.replace(/\D/g, '')}` : phone)
  const email = settings.contact_email || 'admissions.g3beducation@gmail.com'
  const address = settings.contact_address || 'G3B Education, 207, Om Sai Datta Niwas, Plot A32, Sector 20, Nerul West, Navi Mumbai 400706, Maharashtra, India'
  const activeSocialLinks = verifiedSocialLinks(socialLinks.length ? socialLinks : defaultHomeData.socialLinks || [], phoneLink)
  const { openModal } = useCounsellingModal()
  const groups = settings.footer_navigation_mode === 'managed'
    ? Object.entries(footerLinks.reduce((grouped, item) => {
      if (/^\/|^#|^https:\/\//i.test(item.url || '')) (grouped[item.groupName] ||= []).push([item.label, item.url])
      return grouped
    }, {})).map(([title, links]) => ({ title, links }))
    : FOOTER_GROUPS

  return (
    <footer className="g3b-site-footer" id="footer">
      <div className="container g3b-footer-container">
        <div className="g3b-footer-grid">
          <div className="g3b-footer-brand-column">
            <Link className="g3b-footer-brand" to="/" aria-label={`${brand} home`}><img src={logoUrl} alt="" width="48" height="48" /><span>{brand}<small>Guidance for your next chapter.</small></span></Link>
            <p className="g3b-footer-about">{settings.footer_about || 'Career counselling, psychometric assessment, IELTS / TOEFL / PTE coaching and study abroad guidance. Your goals, with a clearer way forward.'}</p>
            <address className="g3b-footer-contact">
              <a href={`tel:${phoneLink}`}><i className="fas fa-phone" aria-hidden="true" /><span>{phone}</span></a>
              <a href={`mailto:${email}`}><i className="fas fa-envelope" aria-hidden="true" /><span>{email}</span></a>
              <p><i className="fas fa-location-dot" aria-hidden="true" /><span>{address}</span></p>
            </address>
            <div className="g3b-footer-social" aria-label="Connect with G3B">{activeSocialLinks.map((link) => <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`G3B on ${link.platform}`} title={link.platform}><i className={link.icon} aria-hidden="true" /></a>)}</div>
            <button className="g3b-footer-book" type="button" onClick={() => openModal()}>Book a Session<i className="fas fa-arrow-right" aria-hidden="true" /></button>
          </div>
          {groups.map((group) => <nav key={group.title} className="g3b-footer-column" aria-label={`${group.title} links`}><h2>{group.title}</h2><ul>{group.links.map(([label, url]) => <li key={label}>{url.startsWith('https://') ? <a href={url} rel="noopener noreferrer">{label}</a> : <Link to={url}>{label}</Link>}</li>)}</ul></nav>)}
        </div>
        <div className="g3b-footer-bottom"><p>{(settings.footer_copyright || `© {year} ${brand}. All rights reserved.`).replace('{year}', new Date().getFullYear())}</p><p>{settings.footer_tagline || content.footer?.body || 'Career Guidance · Psychometric Assessment · Study Abroad'}</p><Link to="/partner-with-us">Partner With Us<i className="fas fa-arrow-up-right-from-square" aria-hidden="true" /></Link></div>
      </div>
      <button className="footer-to-top" type="button" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><i className="fas fa-arrow-up" aria-hidden="true" /></button>
    </footer>
  )
}
