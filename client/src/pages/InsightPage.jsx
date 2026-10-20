import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
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
  return <article className="section article-page"><div className="container article-container"><Link className="insight-all-link" to="/insights"><ArrowLeft size={17} aria-hidden="true" /> All insights</Link><header><span className="g3b-eyebrow">{article.category}</span><h1>{article.title}</h1><p className="article-deck">{article.excerpt}</p><p className="article-byline">G3B Education · <time dateTime={article.date}>20 October 2026</time> · {article.minutes} min read</p></header><div className="article-copy">{article.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><p>{section.text}</p></section>)}{article.sources.length > 0 && <aside className="article-sources"><h2>Official sources</h2><p>Policy information checked on 20 October 2026. Review the current rules when making your plans.</p><ul>{article.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}<ExternalLink size={14} aria-hidden="true" /></a></li>)}</ul></aside>}</div><div className="article-cta"><h2>Make this useful for your own journey.</h2><p>Talk through your goals and next steps with a G3B counsellor.</p><button type="button" className="btn btn-primary" onClick={() => openModal({ leadSource: 'insight', message: `I'd like guidance after reading: ${article.title}` })}>Book free counselling <ArrowRight size={17} aria-hidden="true" /></button></div></div></article>
}
