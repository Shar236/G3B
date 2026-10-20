/** Full-width call to action for the external career mentor / psychometric tool. */
export default function CareerCta({ content = {}, settings = {} }) {
  const url = content.career_cta?.ctaUrl || settings.career_mentor_url
  if (!url) return null

  return (
    <section className="career-cta">
      <div className="container">
        <h2>{content.career_cta?.heading || 'Career Guidance & Psychometric Assessment'}</h2>
        {content.career_cta?.body ? <p>{content.career_cta.body}</p> : null}
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          <i className="fas fa-external-link-alt" aria-hidden="true" />
          {content.career_cta?.ctaLabel || 'Take Psychometric Assessment'}
        </a>
      </div>
    </section>
  )
}
