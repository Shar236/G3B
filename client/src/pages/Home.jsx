import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSiteContent } from '../components/layout/PublicLayout.jsx'
import usePageSeo from '../hooks/usePageSeo.js'
import { resolveMediaUrl } from '../api/client.js'
import Hero from '../components/Hero.jsx'
import About from '../components/About.jsx'
import Gallery from '../components/Gallery.jsx'
import Services from '../components/Services.jsx'
import Destinations from '../components/Destinations.jsx'
import Reviews from '../components/Reviews.jsx'
import VideoTestimonials from '../components/VideoTestimonials.jsx'
import Process from '../components/Process.jsx'
import CareerCta from '../components/CareerCta.jsx'
import ContactForm from '../components/ContactForm.jsx'
import Pathways from '../components/Pathways.jsx'
import PathwayFinder from '../components/PathwayFinder.jsx'
import KnowledgeHub from '../components/KnowledgeHub.jsx'
import Insights from '../components/Insights.jsx'
import defaultHomeData from '../data/defaultHomeContent.js'

/** The public G3B Education homepage, rebuilt from the supplied content. */
export default function Home() {
  const { data } = useSiteContent()
  const location = useLocation()
  const activeData = data || defaultHomeData
  const content = activeData.content || defaultHomeData.content
  const settings = activeData.settings || defaultHomeData.settings
  const stats = (activeData.stats && activeData.stats.length > 0) ? activeData.stats : defaultHomeData.stats
  const whyFeatures = (activeData.whyFeatures && activeData.whyFeatures.length > 0) ? activeData.whyFeatures : defaultHomeData.whyFeatures
  const certifications = activeData.certifications || defaultHomeData.certifications
  const services = (activeData.services && activeData.services.length > 0) ? activeData.services : defaultHomeData.services
  const destinations = (activeData.destinations && activeData.destinations.length > 0) ? activeData.destinations : defaultHomeData.destinations
  const gallery = activeData.gallery || defaultHomeData.gallery
  const testimonials = (activeData.testimonials && activeData.testimonials.length > 0) ? activeData.testimonials : defaultHomeData.testimonials
  const videos = (activeData.videos && activeData.videos.length > 0) ? activeData.videos : defaultHomeData.videos
  const processSteps = (activeData.processSteps && activeData.processSteps.length > 0) ? activeData.processSteps : defaultHomeData.processSteps
  const enquiryOptions = (activeData.enquiryOptions && activeData.enquiryOptions.length > 0) ? activeData.enquiryOptions : defaultHomeData.enquiryOptions

  // Metadata published in the admin SEO manager wins; the settings are the
  // fallback for an unregistered route or while the request is in flight.
  usePageSeo('/', {
    title: settings?.seo_title,
    description: settings?.seo_description,
    keywords: settings?.seo_keywords,
    image: settings?.founder_image_url ? resolveMediaUrl(settings.founder_image_url) : undefined,
  })

  // Support deep links such as /#services by scrolling once content renders.
  useEffect(() => {
    if (!location.hash) return
    const target = document.getElementById(location.hash.slice(1))
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, data])

  return (
    <>
      <Hero content={content} settings={settings} stats={stats} />
      <Pathways />
      <PathwayFinder />
      <About content={content} settings={settings} features={whyFeatures} certifications={certifications} />
      <Gallery content={content} images={gallery} />
      <Services content={content} services={services} />
      <Destinations content={content} destinations={destinations} />
      <Reviews content={content} settings={settings} testimonials={testimonials} />
      <VideoTestimonials content={content} videos={videos} />
      <Process content={content} steps={processSteps} />
      <CareerCta content={content} settings={settings} />
      <ContactForm
        content={content}
        settings={settings}
        options={enquiryOptions}
        destinations={destinations}
      />
      <KnowledgeHub />
      <Insights />
    </>
  )
}
