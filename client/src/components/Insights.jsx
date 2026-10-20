import { Link } from 'react-router-dom'
import { ArrowRight, Compass, Globe2, GraduationCap } from 'lucide-react'
import { insights } from '../data/insights.js'

const icons = { globe: Globe2, compass: Compass, graduation: GraduationCap }

export default function Insights() {
  return <section className="section insights-section" id="insights" aria-labelledby="insights-heading"><div className="container"><div className="section-head insights-head"><div><span className="g3b-eyebrow">STUDY ABROAD INSIGHTS</span><h2 className="section-title" id="insights-heading">Fresh perspectives for your next step.</h2><p className="section-subtitle">Practical reading for better decisions, wherever you are in your journey.</p></div><Link to="/insights" className="insight-all-link">All insights <ArrowRight size={17} aria-hidden="true" /></Link></div><div className="insights-grid">{insights.map((article, index) => { const Icon = icons[article.icon]; return <article className="insight-card" key={article.slug}><div className={`insight-art insight-art-${index}`} aria-hidden="true"><Icon size={59} strokeWidth={1.2} /><span>G3B FIELD NOTES / 0{index + 1}</span></div><div className="insight-body"><span className="g3b-eyebrow">{article.category}</span><h3><Link to={`/insights/${article.slug}`}>{article.title}</Link></h3><p>{article.excerpt}</p><div className="insight-meta"><span>{article.minutes} min read</span><Link to={`/insights/${article.slug}`} aria-label={`Read article: ${article.title}`}>Read article <ArrowRight size={16} aria-hidden="true" /></Link></div></div></article> })}</div></div></section>
}
