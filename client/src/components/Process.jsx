/** The numbered "Your Pathway to Success" process steps. */
export default function Process({ content = {}, steps = [] }) {
  if (steps.length === 0) return null

  return (
    <section className="section" id="process">
      <div className="container">
        <h2 className="section-title">{content.process?.heading || 'Your Pathway to Success'}</h2>
        {content.process?.subheading ? <p className="section-subtitle">{content.process.subheading}</p> : null}

        <div className="process-steps">
          {steps.map((step) => (
            <div className="step" key={step.id}>
              <div className="step-number">{step.stepNumber}</div>
              <div className="step-icon">
                <i className={step.icon || 'fas fa-circle-check'} aria-hidden="true" />
              </div>
              <h4>{step.title}</h4>
              {step.description ? <p>{step.description}</p> : null}
              {step.badge ? <span className="step-badge">{step.badge}</span> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
