import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Check, Clock3, ExternalLink, Home } from 'lucide-react'
import { insights } from '../data/insights.js'
import usePageSeo from '../hooks/usePageSeo.js'
import { useCounsellingModal } from '../context/CounsellingContext.jsx'
import Insights from '../components/Insights.jsx'
import NotFound from './NotFound.jsx'

export default function InsightPage() {
  const { slug } = useParams()
  const article = insights.find((item) => item.slug === slug)
  const { openModal } = useCounsellingModal()
  usePageSeo(slug ? `/insights/${slug}` : '/insights', { title: `${article?.title || 'Study Abroad Insights'} | G3B Education`, description: article?.excerpt || 'Explore G3B Education insights on study abroad, career assessments and scholarship planning.', jsonLd: article ? { '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.excerpt, datePublished: article.date, dateModified: article.date, author: { '@type': 'Organization', name: 'G3B Education' } } : undefined })
  useEffect(() => { window.scrollTo(0, 0) }, [slug])
  if (slug && !article) return <NotFound />
  if (!article) return <Insights />
  const related = insights.filter((item) => item.slug !== article.slug && item.category === article.category).concat(insights.filter((item) => item.slug !== article.slug && item.category !== article.category)).slice(0, 3)
  const formattedDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${article.date}T00:00:00`))
  return <article className="article-page"><header className="article-hero"><div className="container article-shell"><nav className="article-breadcrumb" aria-label="Breadcrumb"><Link to="/"><Home size={14} />Home</Link><span>/</span><Link to="/insights">Insights</Link><span>/</span><span aria-current="page">{article.category}</span></nav><span className="editorial-category">{article.category}</span><h1>{article.title}</h1><p className="article-deck">{article.excerpt}</p><p className="article-byline"><time dateTime={article.date}>{formattedDate}</time><span>·</span><span><Clock3 size={14} />{article.minutes} min read</span></p></div></header><div className="container article-image-wrap"><img className="article-hero-image" src={article.image} alt={article.imageAlt} width="1180" height="660" /></div><div className="container article-shell"><div className="article-copy">{article.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><p>{section.text}</p>{section.points?.length > 0 && <ul>{section.points.map((point) => <li key={point}><Check size={17} />{point}</li>)}</ul>}</section>)}{article.sources.length > 0 && <aside className="article-sources"><h2>Official sources</h2><p>Policy information can change. Review the current official rules when making plans.</p><ul>{article.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}<ExternalLink size={14} /></a></li>)}</ul></aside>}</div><div className="article-cta"><div><span>Personal guidance</span><h2>Apply this thinking to your own education plan.</h2><p>Talk through your circumstances and next steps with a G3B counsellor.</p></div><button type="button" className="btn btn-primary" onClick={() => openModal({ leadSource: 'insight', message: `I'd like guidance after reading: ${article.title}` })}>Book a consultation <ArrowRight size={17} /></button></div></div><section className="article-related"><div className="container"><div className="editorial-subhead"><h2>Continue reading</h2><Link to="/insights">View all insights <ArrowRight size={16} /></Link></div><div className="article-related-grid">{related.map((item) => <article key={item.slug}><Link to={`/insights/${item.slug}`}><img src={item.image} alt={item.imageAlt} loading="lazy" width="420" height="260" /><span>{item.category}</span><h3>{item.title}</h3><small>{item.minutes} min read</small></Link></article>)}</div></div></section></article>
}
