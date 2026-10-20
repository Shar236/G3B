import { createContext, useContext, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../Header.jsx'
import Footer from '../Footer.jsx'
import useHomeContent from '../../hooks/useHomeContent.js'
import { PageLoader, StateBlock } from '../ui/StateBlock.jsx'
import { CounsellingProvider } from '../../context/CounsellingContext.jsx'
import CounsellingModal from '../ui/CounsellingModal.jsx'
import { resolveMediaUrl } from '../../api/client.js'
import ErrorBoundary from '../ui/ErrorBoundary.jsx'

const SiteContentContext = createContext(null)

/** Access the shared homepage payload from any public page. */
export function useSiteContent() {
  const context = useContext(SiteContentContext)
  if (!context) throw new Error('useSiteContent must be used inside PublicLayout')
  return context
}

/** Public site chrome: header, footer, dynamic tracking & favicon, and counselling modal. */
export default function PublicLayout() {
  const { data, loading, error, reload } = useHomeContent()
  const location = useLocation()

  // Dynamic favicon and tracking script injection from Admin Settings
  useEffect(() => {
    if (!data?.settings) return

    // Dynamic favicon
    if (data.settings.favicon_url) {
      let link = document.querySelector("link[rel*='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'shortcut icon'
        document.head.appendChild(link)
      }
      link.href = resolveMediaUrl(data.settings.favicon_url)
    }

    // Dynamic head tracking code
    if (data.settings.tracking_code_head && !document.getElementById('g3b-tracking-head')) {
      const container = document.createElement('div')
      container.id = 'g3b-tracking-head'
      container.innerHTML = data.settings.tracking_code_head
      Array.from(container.children).forEach((el) => {
        if (el.tagName === 'SCRIPT') {
          const s = document.createElement('script')
          Array.from(el.attributes).forEach((a) => s.setAttribute(a.name, a.value))
          s.text = el.text
          document.head.appendChild(s)
        } else {
          document.head.appendChild(el.cloneNode(true))
        }
      })
    }

    // Dynamic body tracking code
    if (data.settings.tracking_code_body && !document.getElementById('g3b-tracking-body')) {
      const container = document.createElement('div')
      container.id = 'g3b-tracking-body'
      container.innerHTML = data.settings.tracking_code_body
      Array.from(container.children).forEach((el) => {
        if (el.tagName === 'SCRIPT') {
          const s = document.createElement('script')
          Array.from(el.attributes).forEach((a) => s.setAttribute(a.name, a.value))
          s.text = el.text
          document.body.appendChild(s)
        } else {
          document.body.appendChild(el.cloneNode(true))
        }
      })
    }
  }, [data?.settings])

  return (
    <SiteContentContext.Provider value={{ data, loading, error, reload }}>
      <CounsellingProvider>
        <a className="sr-only" href="#primary">
          Skip to content
        </a>
        <Header settings={data?.settings} navigation={data?.navigation} />
        <main id="primary" className="site-main">
          {loading ? (
            <PageLoader label="Loading G3B Education…" />
          ) : error ? (
            <div className="container" style={{ padding: '80px 24px' }}>
              <StateBlock variant="error" title="We could not load the website content" message={error.message} onRetry={reload} />
            </div>
          ) : (
            <ErrorBoundary resetKey={location.pathname}><Outlet /></ErrorBoundary>
          )}
        </main>
        <Footer
          settings={data?.settings}
          content={data?.content}
          socialLinks={data?.socialLinks}
          services={data?.services}
          destinations={data?.destinations}
        />
        <CounsellingModal />
      </CounsellingProvider>
    </SiteContentContext.Provider>
  )
}
