import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import VideoPlayer from './VideoPlayer.jsx'
import { paginationWindow, playableVideos } from './videoPlayback.js'
import './videoTestimonials.css'

const BASE_CATEGORIES = ['All', 'What Parents Say', 'Student Review']
const CHANNEL_URL = 'https://www.youtube.com/@g3beducation_nerul/shorts'

/** One active player, with every cached testimonial reachable by keyboard or selection. */
export default function VideoTestimonials({ content = {}, videos = [], loading = false, error = null, onRetry }) {
  const [selection, setSelection] = useState({ category: 'All', key: null })
  const catalog = useMemo(() => playableVideos(videos), [videos])
  const categories = [...new Set([...BASE_CATEGORIES, ...catalog.map((video) => video.category).filter(Boolean)])]
  const category = categories.includes(selection.category) ? selection.category : 'All'
  const filtered = catalog.filter((video) => category === 'All' || video.category === category)
  const index = Math.max(0, filtered.findIndex((video) => video.identity.key === selection.key))
  const active = filtered[index]
  const total = filtered.length

  function goTo(next) {
    if (!total) return
    const position = ((next % total) + total) % total
    setSelection({ category, key: filtered[position].identity.key })
  }

  function onKeyDown(event) {
    if (['SELECT', 'INPUT', 'TEXTAREA'].includes(event.target.tagName) || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(index + 1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(index - 1) }
    if (event.key === 'Home') { event.preventDefault(); goTo(0) }
    if (event.key === 'End') { event.preventDefault(); goTo(total - 1) }
  }

  return <section className="section video-testimonials" id="video-testimonial" aria-labelledby="video-testimonials-heading">
    <div className="container">
      <div className="video-section-heading"><h2 className="section-title" id="video-testimonials-heading">{content.videos?.heading || 'Hear It From Them'}</h2><p className="section-subtitle">{content.videos?.subheading || 'Real experiences, shared by our students and their families.'}</p></div>
      <div className="video-category-tabs" role="group" aria-label="Filter video testimonials">{categories.map((item) => <button key={item} type="button" className={`btn btn-sm ${category === item ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={category === item} onClick={() => setSelection({ category: item, key: null })}>{item}</button>)}</div>
      <div className="video-carousel" role="region" aria-roledescription="carousel" aria-label="Video testimonials" tabIndex={0} onKeyDown={onKeyDown} aria-busy={loading}>
        {loading ? <div className="video-carousel-placeholder" role="status">Loading video testimonials…</div> : error ? <div className="video-carousel-placeholder" role="alert"><p>We couldn’t load the video testimonials.</p>{onRetry && <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>Try again</button>}<a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer">Visit our YouTube Shorts <ExternalLink size={14} aria-hidden="true" /></a></div> : active ? <>
          <div role="group" aria-roledescription="slide" aria-label={`Video ${index + 1} of ${total}`}><VideoPlayer key={active.identity.key} video={active} /></div>
          <div className="video-carousel-controls"><button type="button" className="video-slider-nav video-slider-prev" aria-label="Previous video" disabled={total < 2} onClick={() => goTo(index - 1)}><ChevronLeft size={22} aria-hidden="true" /></button><p aria-live="polite" aria-atomic="true">Video {index + 1} of {total}</p><button type="button" className="video-slider-nav video-slider-next" aria-label="Next video" disabled={total < 2} onClick={() => goTo(index + 1)}><ChevronRight size={22} aria-hidden="true" /></button></div>
          {total > 1 && <div className="video-slider-dots" role="group" aria-label="Choose a testimonial">{paginationWindow(index, total).map((position) => <button type="button" key={filtered[position].identity.key} className={`video-dot${position === index ? ' active' : ''}`} aria-label={`Go to video ${position + 1}: ${filtered[position].title}`} aria-current={position === index ? 'true' : undefined} onClick={() => goTo(position)} />)}</div>}
          {total > 7 && <div className="video-select"><label htmlFor="testimonial-video-select">Jump to a video</label><select id="testimonial-video-select" value={active.identity.key} onChange={(event) => setSelection({ category, key: event.target.value })}>{filtered.map((video, position) => <option key={video.identity.key} value={video.identity.key}>{position + 1}. {video.title}</option>)}</select></div>}
        </> : <div className="video-carousel-placeholder"><p>{category === 'All' ? 'Video testimonials will appear here when they are available.' : `No videos have been assigned to “${category}” yet.`}</p>{category !== 'All' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelection({ category: 'All', key: null })}>Show all videos</button>}<a href={CHANNEL_URL} target="_blank" rel="noopener noreferrer">Visit our YouTube Shorts <ExternalLink size={14} aria-hidden="true" /></a></div>}
      </div>
    </div>
  </section>
}
