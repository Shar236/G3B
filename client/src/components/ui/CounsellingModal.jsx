import { useEffect, useRef } from 'react'
import { useCounsellingModal } from '../../context/CounsellingContext.jsx'
import { useSiteContent } from '../layout/PublicLayout.jsx'
import ConsultationForm from './ConsultationForm.jsx'

export default function CounsellingModal() {
  const { isOpen, initialData, closeModal } = useCounsellingModal()
  const { data } = useSiteContent()
  const enquiryOptions = data?.enquiryOptions || []
  const destinations = data?.destinations || []
  const dialogRef = useRef(null)

  // Close on Escape key press and prevent background page scrolling
  useEffect(() => {
    if (!isOpen) return

    const previousFocus = document.activeElement
    dialogRef.current?.querySelector('button, input, select, textarea')?.focus()
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeModal()
      if (e.key === 'Tab') {
        const controls = [...(dialogRef.current?.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') || [])]
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
      previousFocus?.focus?.()
    }
  }, [isOpen, closeModal])

  if (!isOpen) return null

  return (
    <div
      className="modal-backdrop open"
      onClick={closeModal}
      role="presentation"
    >
      <div
        className="counselling-modal-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="counselling-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header: stays fixed at top of modal */}
        <div className="modal-header">
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#2563eb',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '4px',
              }}
            >
              <i className="fas fa-graduation-cap" /> Free Expert Consultation
            </div>
            <h2
              id="counselling-modal-title"
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 800,
                color: '#0B2C5F',
                lineHeight: 1.3,
              }}
            >
              {initialData?.serviceInterest
                ? `Enquire About: ${initialData.serviceInterest}`
                : 'Book Your Free Study Abroad Counselling'}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={closeModal}
            aria-label="Close dialog"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              fontSize: '16px',
              flexShrink: 0,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body: scrolls vertically within viewport */}
        <div className="modal-body">
          <ConsultationForm
            initialValues={initialData}
            options={enquiryOptions}
            destinations={destinations}
            inModal={true}
            theme="light"
          />
        </div>
      </div>
    </div>
  )
}
