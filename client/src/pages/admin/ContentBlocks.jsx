import { useCallback, useEffect, useState } from 'react'
import { fetchContentBlocks } from '../../api/contentApi.js'
import { updateContentBlock } from '../../api/adminApi.js'
import { parseApiError } from '../../api/client.js'
import { StateBlock } from '../../components/ui/StateBlock.jsx'

const FIELDS = [
  { name: 'heading', label: 'Heading' },
  { name: 'subheading', label: 'Subheading' },
  { name: 'body', label: 'Body text', textarea: true },
  { name: 'ctaLabel', label: 'Button label' },
  { name: 'ctaUrl', label: 'Button link' },
]

const BLOCK_LABELS = {
  hero: 'Hero',
  why: 'Why choose G3B',
  gallery: 'Gallery',
  services: 'Services',
  destinations: 'Destinations',
  reviews: 'Google reviews',
  videos: 'Video testimonials',
  process: 'Process steps',
  career_cta: 'Career mentor call to action',
  contact: 'Contact section',
  footer: 'Footer tagline',
  faqs: 'Homepage FAQs introduction',
}

/** Edit the headings, descriptions and CTA labels of each homepage section. */
export default function ContentBlocks() {
  const [blocks, setBlocks] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [savingKey, setSavingKey] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const stored = await fetchContentBlocks()
      setBlocks({ ...Object.fromEntries(Object.keys(BLOCK_LABELS).map((key) => [key, {}])), ...stored })
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const update = (key, field, value) => {
    setBlocks((current) => ({ ...current, [key]: { ...current[key], [field]: value } }))
  }

  const save = async (key) => {
    setSavingKey(key)
    setNotice(null)
    try {
      const block = blocks[key]
      await updateContentBlock(key, {
        heading: block.heading || null,
        subheading: block.subheading || null,
        body: block.body || null,
        ctaLabel: block.ctaLabel || null,
        ctaUrl: block.ctaUrl || null,
      })
      setNotice({ type: 'success', message: `${BLOCK_LABELS[key] || key} content saved.` })
    } catch (err) {
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally {
      setSavingKey(null)
    }
  }

  if (loading) return <StateBlock variant="loading" title="Loading homepage content…" />
  if (error) return <StateBlock variant="error" title="Could not load homepage content" message={error.message} onRetry={load} />

  return (
    <>
      {notice ? (
        <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <span>{notice.message}</span>
        </p>
      ) : null}

      {Object.entries(blocks).map(([key, block]) => (
        <div className="admin-card" key={key}>
          <div className="admin-card-head">
            <h2>
              <i className="fas fa-pen-to-square" aria-hidden="true" /> {BLOCK_LABELS[key] || key}
            </h2>
            <button type="button" className="btn btn-primary btn-sm" disabled={savingKey === key} onClick={() => save(key)}>
              {savingKey === key ? (
                <>
                  <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Saving…
                </>
              ) : (
                <>
                  <i className="fas fa-floppy-disk" aria-hidden="true" /> Save
                </>
              )}
            </button>
          </div>

          {FIELDS.map((field) => (
            <div className="admin-field" key={field.name}>
              <label htmlFor={`${key}-${field.name}`}>{field.label}</label>
              {field.textarea ? (
                <textarea
                  id={`${key}-${field.name}`}
                  className="admin-textarea"
                  rows={5}
                  value={block[field.name] || ''}
                  onChange={(event) => update(key, field.name, event.target.value)}
                />
              ) : (
                <input
                  id={`${key}-${field.name}`}
                  className="admin-input"
                  type="text"
                  value={block[field.name] || ''}
                  onChange={(event) => update(key, field.name, event.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
