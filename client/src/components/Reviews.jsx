const stars = (rating) => '★★★★★'.slice(0, Math.max(0, Math.min(5, Math.round(rating))))
const httpsUrl = (value) => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null } catch { return null } }

/** Google Business Profile score card plus the individual reviews. */
export default function Reviews({ content = {}, settings = {}, testimonials = [] }) {
  if (['false', '0', false, 0].includes(settings.show_google_reviews)) return null
  if (testimonials.length === 0) return null

  const reviewUrl = httpsUrl(settings.google_review_url || content.reviews?.ctaUrl)
  const rating = Number(settings.google_rating)
  const showScore = reviewUrl && Number.isFinite(rating) && rating >= 1 && rating <= 5
  const reviewCount = settings.google_review_count

  return (
    <section className="section section-alt" id="reviews">
      <div className="container">
        <div className="reviews-header">
          <div className="section-head">
            <h2 className="section-title">{showScore ? content.reviews?.heading || 'What Students Say on Google' : 'Student experiences'}</h2>
            {content.reviews?.subheading ? <p className="section-subtitle">{content.reviews.subheading}</p> : null}
          </div>

          {showScore && <a
            href={reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="gmb-score"
            title="View all reviews on Google"
          >
            <div>
              <div className="gmb-score-number">{rating}</div>
              <div className="gmb-stars" aria-hidden="true">
                {stars(Number(rating))}
              </div>
              <div className="gmb-count">
                {reviewCount ? `Based on ${reviewCount} Google reviews` : 'Rated on Google'}
              </div>
            </div>
            <div className="gmb-logo">
              <i className="fab fa-google" aria-hidden="true" />
              {content.reviews?.ctaLabel || 'View on Google'}
            </div>
          </a>}
        </div>

        <div className="reviews-grid">
          {testimonials.map((testimonial) => {
            const sourceUrl = httpsUrl(testimonial.sourceUrl)
            const isLink = Boolean(sourceUrl)
            const Tag = isLink ? 'a' : 'div'
            const linkProps = isLink
              ? { href: sourceUrl, target: '_blank', rel: 'noopener noreferrer' }
              : {}

            return (
              <Tag className="review-card" key={testimonial.id} {...linkProps}>
                <div className="review-header">
                  <div className="review-avatar" aria-hidden="true">
                    {testimonial.avatarText || testimonial.authorName?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="review-name">{testimonial.authorName}</div>
                    <div className="review-meta">{testimonial.postedLabel}</div>
                  </div>
                </div>
                {Number(testimonial.rating) >= 1 && Number(testimonial.rating) <= 5 && <div className="review-stars" aria-label={`${testimonial.rating} out of 5 stars`}>
                  {stars(Number(testimonial.rating))}
                </div>}
                <p className="review-text">{testimonial.content}</p>
                {testimonial.source === 'google' && isLink ? (
                  <div className="review-source">
                    <i className="fab fa-google" aria-hidden="true" /> View on Google
                  </div>
                ) : null}
              </Tag>
            )
          })}
        </div>
      </div>
    </section>
  )
}
