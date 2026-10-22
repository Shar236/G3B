import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

const desktopPointer = '(hover: hover) and (pointer: fine) and (min-width: 900px)'
const mediaMatches = (query) => Boolean(window.matchMedia?.(query)?.matches)

export default function MotionEnhancer() {
  const location = useLocation()
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const [cursorLabel, setCursorLabel] = useState('')

  useEffect(() => {
    const reduced = mediaMatches('(prefers-reduced-motion: reduce)')
    const revealNodes = [...document.querySelectorAll('main section:not(.hero-home), main .editorial-card, main .service-card, main .dest-card, main .review-card, footer')]
    revealNodes.forEach((node) => node.classList.add('motion-reveal'))
    if (reduced || !('IntersectionObserver' in window)) {
      revealNodes.forEach((node) => node.classList.add('is-visible'))
      return undefined
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) }
    }), { threshold: .12, rootMargin: '0px 0px -7% 0px' })
    revealNodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [location.pathname])

  useEffect(() => {
    const header = document.querySelector('.g3b-site-header')
    let progress = document.querySelector('.reading-progress')
    if (!progress && document.querySelector('.article-page')) {
      progress = document.createElement('div'); progress.className = 'reading-progress'; progress.setAttribute('aria-hidden','true'); document.body.appendChild(progress)
    }
    const onScroll = () => {
      header?.classList.toggle('is-scrolled', window.scrollY > 18)
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight
        progress.style.setProperty('--reading-progress', `${max > 0 ? Math.min(100, window.scrollY / max * 100) : 0}%`)
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (progress?.parentElement === document.body) progress.remove() }
  }, [location.pathname])

  useEffect(() => {
    if (!mediaMatches(desktopPointer) || mediaMatches('(prefers-reduced-motion: reduce)')) return undefined
    document.documentElement.classList.add('has-custom-cursor')
    let targetX = -100, targetY = -100, ringX = -100, ringY = -100, frame
    const move = (event) => { targetX = event.clientX; targetY = event.clientY }
    const tick = () => {
      ringX += (targetX - ringX) * .16; ringY += (targetY - ringY) * .16
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${targetX}px,${targetY}px,0)`
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${ringX}px,${ringY}px,0)`
      frame = requestAnimationFrame(tick)
    }
    const over = (event) => {
      const interactive = event.target.closest('a,button,.service-card,.dest-card,.review-card,.editorial-card')
      document.documentElement.classList.toggle('cursor-active', Boolean(interactive))
      setCursorLabel(event.target.closest('.editorial-card') ? 'Read' : event.target.closest('a img,.dest-card img,.service-card img') ? 'View' : '')
    }
    document.addEventListener('pointermove', move, { passive:true }); document.addEventListener('pointerover', over, { passive:true }); tick()
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointermove', move); document.removeEventListener('pointerover', over); document.documentElement.classList.remove('has-custom-cursor','cursor-active') }
  }, [location.pathname])

  useEffect(() => {
    if (!mediaMatches(desktopPointer) || mediaMatches('(prefers-reduced-motion: reduce)')) return undefined
    const magnetic = [...document.querySelectorAll('.btn, .header-counselling-cta, .g3b-footer-book')]
    const cards = [...document.querySelectorAll('.service-card,.dest-card,.review-card,.editorial-card,.sd-related .container>div>a')]
    const cleanups = []
    magnetic.forEach((node) => {
      const move = (event) => { const r=node.getBoundingClientRect(); node.style.transform=`translate3d(${(event.clientX-r.left-r.width/2)*.09}px,${(event.clientY-r.top-r.height/2)*.12}px,0)` }
      const leave = () => { node.style.transform='' }
      node.addEventListener('pointermove',move); node.addEventListener('pointerleave',leave); cleanups.push(()=>{node.removeEventListener('pointermove',move);node.removeEventListener('pointerleave',leave);node.style.transform=''})
    })
    cards.forEach((node) => {
      const move = (event) => { const r=node.getBoundingClientRect(); const x=(event.clientX-r.left)/r.width-.5; const y=(event.clientY-r.top)/r.height-.5; node.style.setProperty('--tilt-x',`${(-y*4).toFixed(2)}deg`);node.style.setProperty('--tilt-y',`${(x*4).toFixed(2)}deg`);node.style.setProperty('--light-x',`${(x+.5)*100}%`);node.style.setProperty('--light-y',`${(y+.5)*100}%`) }
      const leave = () => { node.style.setProperty('--tilt-x','0deg');node.style.setProperty('--tilt-y','0deg') }
      node.addEventListener('pointermove',move);node.addEventListener('pointerleave',leave);cleanups.push(()=>{node.removeEventListener('pointermove',move);node.removeEventListener('pointerleave',leave)})
    })
    return () => cleanups.forEach((cleanup)=>cleanup())
  }, [location.pathname])

  return <><div className="premium-cursor-dot" ref={dotRef} aria-hidden="true" /><div className={`premium-cursor-ring${cursorLabel ? ' has-label' : ''}`} ref={ringRef} aria-hidden="true"><span>{cursorLabel}</span></div></>
}
