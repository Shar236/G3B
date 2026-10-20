import { useCallback, useEffect, useState } from 'react'
import { updateSiteSettings, uploadImage } from '../../api/adminApi.js'
import api, { parseApiError, resolveMediaUrl } from '../../api/client.js'
import { StateBlock } from '../../components/ui/StateBlock.jsx'

const SETTINGS_SECTIONS = [
  {
    id: 'brand',
    title: 'Brand & Header',
    icon: 'fas fa-id-card',
    description: 'Header logo, brand typography, subheadings and primary CTA destination.',
    fields: [
      { key: 'brand_name', label: 'Brand Name', type: 'text', placeholder: 'G3B Education' },
      { key: 'header_logo_url', label: 'Header Brand Logo Image', type: 'image', placeholder: '/uploads/logo.webp' },
      { key: 'header_subheading', label: 'Header Subheading', type: 'text', placeholder: 'Career Guidance · Study Abroad' },
      { key: 'header_cta_label', label: 'Header CTA Button Label', type: 'text', placeholder: 'Free Counselling' },
      { key: 'header_cta_url', label: 'Header CTA Action / URL', type: 'text', placeholder: '#contact or modal', hint: 'Leave as #contact to trigger the Free Counselling modal dialog.' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact & Office',
    icon: 'fas fa-location-dot',
    description: 'Physical campus address, phone numbers, admissions email and operating hours.',
    fields: [
      { key: 'contact_office_heading', label: 'Office Heading', type: 'text', placeholder: 'Head Office' },
      { key: 'contact_address', label: 'Full Physical Address', type: 'textarea', rows: 3 },
      { key: 'contact_phone', label: 'Display Phone Number', type: 'text', placeholder: '8928659569' },
      { key: 'contact_phone_link', label: 'International Tel Link', type: 'text', placeholder: '+918928659569' },
      { key: 'contact_email', label: 'Admissions Contact Email', type: 'text', placeholder: 'admissions.g3beducation@gmail.com' },
      { key: 'working_hours', label: 'Working Hours', type: 'text', placeholder: 'Mon – Sat: 10:00 AM – 7:00 PM' },
    ],
  },
  {
    id: 'hero',
    title: 'Hero & Landing',
    icon: 'fas fa-rocket',
    description: 'Hero section pill badges, background media, and action buttons.',
    fields: [
      { key: 'hero_badge', label: 'Hero Top Pill Badge', type: 'text', placeholder: 'Career Guidance · Psychometric Assessment · Study Abroad' },
      { key: 'hero_bg_image_url', label: 'Hero Background Media URL', type: 'image', placeholder: '/uploads/hero-bg.webp' },
      { key: 'hero_cta_career_label', label: 'Career Mentor Button Label', type: 'text', placeholder: 'Career Mentor' },
      { key: 'hero_cta_career_url', label: 'Career Mentor Destination Link', type: 'text', placeholder: 'https://careermentor.g3beducation.com/' },
      { key: 'hero_cta_services_label', label: 'Services Button Label', type: 'text', placeholder: 'Explore Services' },
      { key: 'hero_cta_services_url', label: 'Services Button Link', type: 'text', placeholder: '/services' },
    ],
  },
  {
    id: 'founder',
    title: 'Founder & Bio',
    icon: 'fas fa-user-tie',
    description: 'Founder biography profile, credentials, and verification badge text.',
    fields: [
      { key: 'founder_name', label: 'Founder Name', type: 'text', placeholder: 'Minal Kulkarni' },
      { key: 'founder_role', label: 'Founder Designation / Title', type: 'text', placeholder: 'Founder, G3B Education' },
      { key: 'founder_image_url', label: 'Founder Profile Photo', type: 'image' },
      { key: 'founder_image_alt', label: 'Founder Photo Alt Text', type: 'text', placeholder: 'Minal Kulkarni, Founder' },
      { key: 'founder_credentials_text', label: 'Founder Credentials Badge Text', type: 'text', placeholder: 'TESOL Certified Master Trainer · 15+ Years Experience' },
      { key: 'certifications_heading', label: 'Certifications Block Title', type: 'text', placeholder: 'Certifications & Credentials' },
    ],
  },
  {
    id: 'reviews',
    title: 'Google Reviews',
    icon: 'fab fa-google',
    description: 'Google Business Profile rating metrics and direct Maps review links.',
    fields: [
      { key: 'show_google_reviews', label: 'Google Reviews showcase', type: 'select', defaultValue: '1', options: [{ value: '1', label: 'Show reviews on the website' }, { value: '0', label: 'Hide reviews on the website' }] },
      { key: 'google_review_url', label: 'Google Review Destination Link', type: 'text', placeholder: 'https://maps.google.com/...' },
      { key: 'google_rating', label: 'Google Business Rating', type: 'text', placeholder: '5.0' },
      { key: 'google_review_count', label: 'Total Google Reviews Count', type: 'text', placeholder: '38' },
      { key: 'google_places_api_key', label: 'Google Places API Key (optional)', type: 'text', placeholder: 'AIzaSy...' },
      { key: 'google_places_place_id', label: 'Google Places Place ID (optional)', type: 'text', placeholder: 'ChIJ...' },
    ],
  },
  {
    id: 'seo',
    title: 'SEO & Social Share',
    icon: 'fas fa-magnifying-glass-chart',
    description: 'Global search engine optimization tags, Open Graph previews and browser favicons.',
    fields: [
      { key: 'seo_title', label: 'Meta Title Tag', type: 'text', placeholder: 'G3B Education | Study Abroad, Career Guidance & Test Prep' },
      { key: 'seo_description', label: 'Meta Description Tag', type: 'textarea', rows: 3 },
      { key: 'seo_keywords', label: 'Meta Keywords', type: 'text', placeholder: 'study abroad, IELTS, career guidance, Navi Mumbai' },
      { key: 'favicon_url', label: 'Favicon URL / SVG', type: 'image', placeholder: '/favicon.svg' },
      { key: 'og_image_url', label: 'Open Graph (Social Share) Image URL', type: 'image' },
      { key: 'og_title', label: 'Open Graph Share Title', type: 'text', placeholder: 'G3B Education | Study Abroad' },
      { key: 'og_description', label: 'Open Graph Share Description', type: 'textarea', rows: 2 },
    ],
  },
  {
    id: 'tracking',
    title: 'Tracking & Analytics',
    icon: 'fas fa-chart-line',
    description: 'Inject Google Analytics, Google Tag Manager, Meta Pixel or custom tracking scripts.',
    fields: [
      { key: 'tracking_code_head', label: 'Head Tracking Code (<script> or tags)', type: 'textarea', rows: 4, placeholder: '<!-- Google Tag Manager or GA4 script -->' },
      { key: 'tracking_code_body', label: 'Body Tracking Code (noscript or footer tags)', type: 'textarea', rows: 4, placeholder: '<!-- Google Tag Manager (noscript) -->' },
    ],
  },
  {
    id: 'footer',
    title: 'Footer & Legal',
    icon: 'fas fa-shoe-prints',
    description: 'Footer copyright note, company tagline, and brief about summary.',
    fields: [
      { key: 'footer_copyright', label: 'Footer Copyright Notice', type: 'text', placeholder: '© {year} G3B Education. All rights reserved.' },
      { key: 'footer_tagline', label: 'Footer Tagline', type: 'text', placeholder: 'Career Guidance · Psychometric Assessment · Study Abroad' },
      { key: 'footer_about', label: 'Footer About Summary', type: 'textarea', rows: 3 },
    ],
  },
]

export default function Settings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('brand')
  const [uploadingKey, setUploadingKey] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/api/admin/site-settings')
      setSettings(response.data.data)
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleUpload = async (key, file) => {
    if (!file) return
    setUploadingKey(key)
    try {
      const res = await uploadImage(file)
      setSettings((cur) => ({ ...cur, [key]: res.relativeUrl || res.url }))
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setUploadingKey(null)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      const updated = await updateSiteSettings(settings)
      setSettings(updated)
      setNotice({ type: 'success', message: 'All site settings have been updated and published.' })
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <StateBlock variant="loading" title="Loading site configuration…" />
  if (error) return <StateBlock variant="error" title="Could not load settings" message={error.message} onRetry={load} />

  const currentSection = SETTINGS_SECTIONS.find((s) => s.id === activeTab) || SETTINGS_SECTIONS[0]

  return (
    <div className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2>
            <i className="fas fa-sliders" aria-hidden="true" /> Global Site Settings & CMS
          </h2>
          <p className="row-sub">
            Centralized content control for brand identity, header navigation, contact info, SEO, and tracking tags.
          </p>
        </div>
      </div>

      {notice ? (
        <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <i className={notice.type === 'success' ? 'fas fa-circle-check' : 'fas fa-circle-exclamation'} aria-hidden="true" />
          <span>{notice.message}</span>
        </p>
      ) : null}

      {/* Navigation tabs */}
      <div className="admin-toolbar" style={{ overflowX: 'auto', flexWrap: 'wrap', gap: '8px', paddingBottom: '12px' }}>
        {SETTINGS_SECTIONS.map((sec) => (
          <button
            key={sec.id}
            type="button"
            className={`btn btn-sm ${activeTab === sec.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(sec.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className={sec.icon} aria-hidden="true" />
            {sec.title}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0', color: '#0B2C5F' }}>
            <i className={currentSection.icon} aria-hidden="true" style={{ marginRight: '8px' }} />
            {currentSection.title}
          </h3>
          <p className="row-sub" style={{ margin: 0 }}>{currentSection.description}</p>
        </div>

        <div className="settings-fields-grid" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {currentSection.fields.map((f) => {
            const val = settings[f.key] ?? f.defaultValue ?? ''
            const inputId = `setting-${f.key}`

            return (
              <div className="admin-field" key={f.key}>
                <label htmlFor={inputId} style={{ fontWeight: 600 }}>{f.label}</label>

                {f.type === 'select' ? (
                  <select id={inputId} className="admin-select" value={String(val)} onChange={(e) => setSettings((cur) => ({ ...cur, [f.key]: e.target.value }))}>
                    {f.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    id={inputId}
                    className="admin-textarea"
                    rows={f.rows || 3}
                    value={val}
                    placeholder={f.placeholder}
                    onChange={(e) => setSettings((cur) => ({ ...cur, [f.key]: e.target.value }))}
                  />
                ) : f.type === 'image' ? (
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        id={inputId}
                        className="admin-input"
                        type="text"
                        value={val}
                        placeholder={f.placeholder || 'https://… or select a file'}
                        onChange={(e) => setSettings((cur) => ({ ...cur, [f.key]: e.target.value }))}
                        style={{ flex: 1 }}
                      />
                      {val ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSettings((cur) => ({ ...cur, [f.key]: '' }))}
                          title="Remove image"
                        >
                          <i className="fas fa-trash-can" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    <div
                      className="admin-dropzone"
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '8px',
                        padding: '12px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        cursor: 'pointer',
                      }}
                      onClick={() => document.getElementById(`${inputId}-file`)?.click()}
                    >
                      <input
                        id={`${inputId}-file`}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleUpload(f.key, e.target.files?.[0])}
                      />
                      <i className="fas fa-cloud-arrow-up" style={{ color: '#0B2C5F', fontSize: '18px', marginRight: '6px' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>
                        {uploadingKey === f.key ? 'Uploading…' : 'Click or drop to replace image'}
                      </span>
                    </div>
                    {val ? (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={resolveMediaUrl(val)}
                          alt="preview"
                          style={{ maxHeight: '60px', maxWidth: '120px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                        />
                        <span className="hint" style={{ wordBreak: 'break-all' }}>{val}</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <input
                    id={inputId}
                    className="admin-input"
                    type="text"
                    value={val}
                    placeholder={f.placeholder}
                    onChange={(e) => setSettings((cur) => ({ ...cur, [f.key]: e.target.value }))}
                  />
                )}

                <p className="hint" style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  {f.hint || `Key: ${f.key}`}
                </p>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Saving Settings…
              </>
            ) : (
              <>
                <i className="fas fa-floppy-disk" aria-hidden="true" /> Save & Publish Settings
              </>
            )}
          </button>
          <span className="row-sub" style={{ fontSize: '12px' }}>Changes take effect instantly across the live website.</span>
        </div>
      </form>
    </div>
  )
}
