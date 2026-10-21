import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSiteContent } from '../components/layout/PublicLayout.jsx'
import usePageSeo from '../hooks/usePageSeo.js'
import { resolveMediaUrl } from '../api/client.js'
import Hero from '../components/Hero.jsx'
import About from '../components/About.jsx'
import Gallery from '../components/Gallery.jsx'
import Approach from '../components/Approach.jsx'
import Services from '../components/Services.jsx'
import Destinations from '../components/Destinations.jsx'
import Reviews from '../components/Reviews.jsx'
import VideoTestimonials from '../components/VideoTestimonials.jsx'
import PartnerSection from '../components/PartnerSection.jsx'
import FaqSection from '../components/FaqSection.jsx'
import CareerCta from '../components/CareerCta.jsx'
import ContactForm from '../components/ContactForm.jsx'
import Pathways from '../components/Pathways.jsx'
import PathwayFinder from '../components/PathwayFinder.jsx'
import KnowledgeHub from '../components/KnowledgeHub.jsx'
import Insights from '../components/Insights.jsx'
import defaultHomeData from '../data/defaultHomeContent.js'

/**
 * The public G3B Education homepage, reorganized into a clear student journey:
 * Section A: Hero & Career Pathways
 * Section B: Why Choose G3B & Team
 * Section C: Our 3-Stage Approach (Discover, Plan, Progress)
 * Section D: Comprehensive Services
 * Section E: Study Destinations
 * Section F: Student Success Stories
 * Section G: Partner With Us (Collaboration)
 * Section H: Resources & FAQs
 * Section I: Final Action CTA & Consultation Form
 */
export default function Home() {
  const { data } = useSiteContent()
  const location = useLocation()
  const activeData = data || defaultHomeData
  const content = activeData.content || defaultHomeData.content
  const settings = activeData.settings || defaultHomeData.settings
  const stats = (activeData.stats && activeData.stats.length > 0) ? activeData.stats : defaultHomeData.stats
  const whyFeatures = (activeData.whyFeatures && activeData.whyFeatures.length > 0) ? activeData.whyFeatures : defaultHomeData.whyFeatures
  const certifications = (activeData.certifications && activeData.certifications.length > 0) ? activeData.certifications : defaultHomeData.certifications
  const services = (activeData.services && activeData.services.length > 0) ? activeData.services : defaultHomeData.services
  const destinations = (activeData.destinations && activeData.destinations.length > 0) ? activeData.destinations : defaultHomeData.destinations
  const gallery = activeData.gallery || defaultHomeData.gallery
  const testimonials = (activeData.testimonials && activeData.testimonials.length > 0) ? activeData.testimonials : defaultHomeData.testimonials
  const videos = (activeData.videos && activeData.videos.length > 0) ? activeData.videos : defaultHomeData.videos
  const enquiryOptions = (activeData.enquiryOptions && activeData.enquiryOptions.length > 0) ? activeData.enquiryOptions : defaultHomeData.enquiryOptions

  // Metadata published in the admin SEO manager wins; settings provide fallbacks
  usePageSeo('/', {
    title: settings?.seo_title,
    description: settings?.seo_description,
    keywords: settings?.seo_keywords,
    image: settings?.founder_image_url ? resolveMediaUrl(settings.founder_image_url) : undefined,
  })

  // Support deep links such as /#services, /#approach, /#why, /#team, /#partner
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const target = document.getElementById(id)
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [location.hash, data])

  return (
    <>
      {/* Section A: Hero communicating career guidance & study abroad */}
      <Hero content={content} settings={settings} stats={stats} />
      <Pathways />
      <PathwayFinder />

      {/* Section B: Why Choose G3B & Verified Leadership */}
      <About content={content} settings={settings} features={whyFeatures} certifications={certifications} />
      <Gallery content={content} images={gallery} />

      {/* Section C: Our 3-Stage Approach (Discover, Plan, Progress) */}
      <Approach />

      {/* Section D: Our Services */}
      <Services content={content} services={services} />

      {/* Section E: Study Destinations */}
      <Destinations content={content} destinations={destinations} />

      {/* Section F: Student Success Stories */}
      <Reviews content={content} settings={settings} testimonials={testimonials} />
      <VideoTestimonials content={content} videos={videos} />

      {/* Section G: Partner With Us */}
      <PartnerSection />

      {/* Section H: Resources and FAQs */}
      <FaqSection />
      <KnowledgeHub />
      <Insights />

      {/* Section I: Final CTA & Contact Form */}
      <CareerCta content={content} settings={settings} />
      <ContactForm
        content={content}
        settings={settings}
        options={enquiryOptions}
        destinations={destinations}
      />
    </>
  )
}
