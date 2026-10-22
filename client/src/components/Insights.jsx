import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Clock3, Search } from 'lucide-react'
import { insightCategories, insights } from '../data/insights.js'

function ArticleCard({ article, compact = false }) {
  return <article className={`editorial-card${compact ? ' editorial-card-compact' : ''}`}><Link className="editorial-image" to={`/insights/${article.slug}`} aria-label={`Read ${article.title}`}><img src={article.image} alt={article.imageAlt} loading="lazy" width="640" height="400" /></Link><div className="editorial-card-body"><span className="editorial-category">{article.category}</span><h3><Link to={`/insights/${article.slug}`}>{article.title}</Link></h3><p>{article.excerpt}</p><div className="editorial-meta"><span><Clock3 size={14} />{article.minutes} min read</span><Link to={`/insights/${article.slug}`} aria-label={`Read article: ${article.title}`}>Read article <ArrowRight size={15} /></Link></div></div></article>
}

function HomeInsights() {
  const featured = insights.find((item) => item.featured) || insights[0]
  const latest = insights.filter((item) => item !== featured).slice(0, 6)
  const more = insights.filter((item) => item !== featured).slice(6, 9)
  return <section className="editorial-home" id="insights" aria-labelledby="insights-heading"><div className="container"><header className="editorial-heading"><div><span className="g3b-eyebrow">INSIGHTS & ARTICLES</span><h2 id="insights-heading">Useful thinking for the decisions ahead.</h2><p>Clear, considered guidance for students and families navigating education choices.</p></div><Link to="/insights">View all insights <ArrowRight size={17} /></Link></header><article className="featured-story"><Link to={`/insights/${featured.slug}`} className="featured-story-image"><img src={featured.image} alt={featured.imageAlt} loading="lazy" width="900" height="560" /></Link><div><span className="editorial-category">Featured · {featured.category}</span><h3><Link to={`/insights/${featured.slug}`}>{featured.title}</Link></h3><p>{featured.excerpt}</p><div className="editorial-meta"><span><Clock3 size={14} />{featured.minutes} min read</span><Link to={`/insights/${featured.slug}`}>Read article <ArrowRight size={15} /></Link></div></div></article><section className="latest-stories"><div className="editorial-subhead"><h3>Latest insights</h3><span>Practical reads for planning well</span></div><div className="editorial-grid">{latest.map((article) => <ArticleCard key={article.slug} article={article} />)}</div></section><section className="more-stories"><div className="editorial-subhead"><h3>Explore more</h3><Link to="/insights">View all insights <ArrowRight size={16} /></Link></div><div>{more.map((article) => <ArticleCard key={article.slug} article={article} compact />)}</div></section></div></section>
}

function InsightsIndex() {
  const [category, setCategory] = useState('All Articles')
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(6)
  const filtered = useMemo(() => insights.filter((article) => (category === 'All Articles' || article.category === category) && `${article.title} ${article.excerpt} ${article.category}`.toLowerCase().includes(query.trim().toLowerCase())), [category, query])
  const updateCategory = (next) => { setCategory(next); setVisible(6) }
  return <div className="insights-index"><section className="insights-index-hero"><div className="container"><span className="g3b-eyebrow">THE G3B EDUCATION JOURNAL</span><h1>Insight for the choices that shape your education.</h1><p>Practical articles on careers, applications, international study and student life—written to help you ask better questions and plan with care.</p></div></section><section className="insights-library"><div className="container"><div className="insights-tools"><div className="insights-filters" role="group" aria-label="Filter articles by category">{insightCategories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => updateCategory(item)}>{item}</button>)}</div><label className="insights-search"><span className="sr-only">Search insights</span><Search size={18} /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisible(6) }} placeholder="Search articles" /></label></div><div className="insights-results-head"><h2>{category}</h2><p>{filtered.length} {filtered.length === 1 ? 'article' : 'articles'}</p></div>{filtered.length ? <><div className="editorial-grid">{filtered.slice(0, visible).map((article) => <ArticleCard key={article.slug} article={article} />)}</div>{visible < filtered.length && <button className="insights-load" type="button" onClick={() => setVisible((count) => count + 6)}>Load more articles <ArrowRight size={16} /></button>}</> : <div className="insights-empty"><h2>No articles found</h2><p>Try a different search or category.</p><button type="button" onClick={() => { setQuery(''); updateCategory('All Articles') }}>Clear filters</button></div>}</div></section></div>
}

export default function Insights() {
  const { pathname } = useLocation()
  return pathname === '/insights' ? <InsightsIndex /> : <HomeInsights />
}
