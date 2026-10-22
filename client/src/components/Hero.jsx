import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'

/**
 * Hero section: Centered single-column layout with glowing amber badge,
 * bold white typography, tagline, description, 3 pill action buttons, and stat counters.
 */
export default function Hero({ content = {}, settings = {}, stats = [] }) {
  const heroRef = useRef(null)
  const { openModal } = useCounsellingModal()
  const badge = settings.hero_badge || 'Career Guidance · Psychometric Assessment · Study Abroad'
  const careerUrl = settings.hero_cta_career_url || content.career_cta?.ctaUrl || 'https://careermentor.g3beducation.com/'
  const bgImage = settings.hero_bg_image_url ? resolveMediaUrl(settings.hero_bg_image_url) : null

  const handleStartClick = (e) => {
    // If the configured CTA URL is an external link, allow normal navigation; otherwise trigger the booking modal
    const ctaUrl = content.hero?.ctaUrl
    if (ctaUrl && ctaUrl.startsWith('http')) {
      return
    }
    e.preventDefault()
    openModal()
  }

  const rawStats = stats && stats.length > 0 ? stats : []

  // Normalize label so "Universities Students Sent To" renders cleanly as "Partner Universities" to match the design
  const displayStats = rawStats.map((stat) => ({
    ...stat,
    label: stat.label === 'Universities Students Sent To' ? 'Partner Universities' : stat.label,
  }))
  const heading = content.hero?.heading || 'Study Abroad with Expert Career Guidance & Psychometric Assessment'
  const headingLines = useMemo(() => {
    if (heading === 'Study Abroad with Expert Career Guidance & Psychometric Assessment') return ['Study Abroad with Expert', 'Career Guidance &', 'Psychometric Assessment']
    const words = heading.split(/\s+/); const size = Math.ceil(words.length / 3)
    return [words.slice(0,size).join(' '),words.slice(size,size*2).join(' '),words.slice(size*2).join(' ')].filter(Boolean)
  }, [heading])

  useEffect(() => {
    const hero = heroRef.current
    if (!hero || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return undefined
    const onMove = (event) => {
      const rect=hero.getBoundingClientRect(); const x=(event.clientX-rect.left)/rect.width; const y=(event.clientY-rect.top)/rect.height
      hero.style.setProperty('--hero-x',`${x*100}%`); hero.style.setProperty('--hero-y',`${y*100}%`); hero.style.setProperty('--hero-shift-x',`${(x-.5)*8}px`); hero.style.setProperty('--hero-shift-y',`${(y-.5)*6}px`)
    }
    hero.addEventListener('pointermove',onMove,{passive:true})
    return () => hero.removeEventListener('pointermove',onMove)
  }, [])

  useEffect(() => {
    const root=heroRef.current; if (!root || !displayStats.length || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return undefined
    const observer=new IntersectionObserver(([entry])=>{ if(!entry.isIntersecting)return; root.querySelectorAll('[data-stat]').forEach((node)=>{const final=Number(node.dataset.stat);const start=performance.now();const tick=(now)=>{const p=Math.min(1,(now-start)/1200);node.textContent=Math.round(final*(1-Math.pow(1-p,3))).toLocaleString('en-IN')+node.dataset.suffix;if(p<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)});observer.disconnect()},{threshold:.5})
    observer.observe(root.querySelector('.hero-stats'))
    return ()=>observer.disconnect()
  }, [displayStats.length])

  return (
    <section
      className="hero hero-home"
      ref={heroRef}
      style={
        bgImage
          ? {
            backgroundImage: `linear-gradient(135deg, rgba(11, 44, 95, 0.95) 0%, rgba(15, 23, 42, 0.92) 100%), url('${bgImage}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }
          : undefined
      }
    >
      <div className="hero-ambient" aria-hidden="true"><i /><i /><i />{Array.from({ length: 12 },(_,index)=><span key={index} />)}</div>
      <div className="container hero-content">
        <div className="hero-badge">
          {/* Split-circle icon matching reference screenshot */}
          <svg className="hero-badge-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 15A7 7 0 1 0 8 1v14zm0 1A8 8 0 1 1 8 0a8 8 0 0 1 0 16z" />
          </svg>
          <span>{badge}</span>
        </div>

        <h1 aria-label={heading}>{headingLines.map((line,index)=><span className="hero-line" key={line}><span style={{'--line-index':index}}>{line}</span></span>)}</h1>

        <p className="hero-tagline">
          {content.hero?.subheading || 'G3B Education – Your Gateway to the Right Career & University'}
        </p>

        <p className="hero-desc">
          {content.hero?.body || 'Start with scientific psychometric assessment and expert career guidance to discover your ideal path — then get IELTS/TOEFL/PTE coaching and end-to-end study abroad support for the USA, UK, Canada, Australia, Europe and more.'}
        </p>

        <div className="hero-btns">
          <a
            href={content.hero?.ctaUrl || '#contact'}
            className="btn btn-primary"
            onClick={handleStartClick}
            aria-label="Book Free Counselling Session"
          >
            <i className="fas fa-rocket" aria-hidden="true" />
            <span>{content.hero?.ctaLabel || 'Start Your Journey'}</span>
          </a>

          <a href={careerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-career">
            <i className="fas fa-compass" aria-hidden="true" />
            <span>{settings.hero_cta_career_label || 'Career Mentor'}</span>
          </a>

          <Link to="/services" className="btn btn-outline">
            <i className="fas fa-list-ul" aria-hidden="true" />
            <span>{settings.hero_cta_services_label || 'Explore Services'}</span>
          </Link>
        </div>

        {displayStats.length > 0 ? (
          <div className="hero-stats">
            {displayStats.map((stat, idx) => (
              <div className="stat-item" key={stat.id || idx}>
                <span className="stat-number" data-stat={String(stat.value).replace(/\D/g,'')} data-suffix={String(stat.value).replace(/[\d,]/g,'')}>{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        ) : null}
        <a className="hero-scroll" href="#pathways" aria-label="Scroll to explore"><span />Explore</a>
      </div>
    </section>
  )
}
