const stars = (rating = 5) => '★★★★★'.slice(0, Math.max(0, Math.min(5, Math.round(rating))))

/** Google Business Profile score card plus the individual reviews. */
export default function Reviews({ content = {}, settings = {}, testimonials = [] }) {
  if (testimonials.length === 0) return null

  const reviewUrl = settings.google_review_url || content.reviews?.ctaUrl || '#'
  const rating = settings.google_rating || '5.0'
  const reviewCount = settings.google_review_count

  return (
    <section className="section section-alt" id="reviews">
      <div className="container">
        <div className="reviews-header">
          <div className="section-head">
            <h2 className="section-title">{content.reviews?.heading || 'What Students Say on Google'}</h2>
            {content.reviews?.subheading ? <p className="section-subtitle">{content.reviews.subheading}</p> : null}
          </div>

          <a
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
          </a>
        </div>

        <div className="reviews-grid">
          {testimonials.map((testimonial) => {
            const isLink = Boolean(testimonial.sourceUrl)
            const Tag = isLink ? 'a' : 'div'
            const linkProps = isLink
              ? { href: testimonial.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }
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
                <div className="review-stars" aria-label={`${testimonial.rating || 5} out of 5 stars`}>
                  {stars(testimonial.rating || 5)}
                </div>
                <p className="review-text">{testimonial.content}</p>
                {testimonial.source === 'google' ? (
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
