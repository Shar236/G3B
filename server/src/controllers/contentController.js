import {
  servicesRepository,
  destinationsRepository,
  galleryRepository,
  testimonialsRepository,
  videosRepository,
  processStepsRepository,
  statsRepository,
  whyFeaturesRepository,
  certificationsRepository,
  enquiryOptionsRepository,
  socialLinksRepository,
  navigationItemsRepository,
  faqsRepository,
} from '../repositories/catalogRepository.js';
import { contentBlocksRepository, settingsRepository } from '../repositories/settingsRepository.js';
import assessmentRepository from '../repositories/assessmentRepository.js';

/** Public, read-only content endpoints (only active rows are exposed). */

export async function listServices(_req, res) {
  res.json({ success: true, data: await servicesRepository.list({ activeOnly: true }) });
}

export async function listDestinations(_req, res) {
  res.json({ success: true, data: await destinationsRepository.list({ activeOnly: true }) });
}

export async function listGallery(_req, res) {
  res.json({ success: true, data: await galleryRepository.list({ activeOnly: true }) });
}

export async function listTestimonials(_req, res) {
  res.json({ success: true, data: await testimonialsRepository.list({ activeOnly: true }) });
}

export async function listVideos(_req, res) {
  res.json({ success: true, data: await videosRepository.list({ activeOnly: true }) });
}

export async function listProcessSteps(_req, res) {
  res.json({ success: true, data: await processStepsRepository.list({ activeOnly: true }) });
}

export async function listStats(_req, res) {
  res.json({ success: true, data: await statsRepository.list({ activeOnly: true }) });
}

export async function listWhyFeatures(_req, res) {
  res.json({ success: true, data: await whyFeaturesRepository.list({ activeOnly: true }) });
}

export async function listCertifications(_req, res) {
  res.json({ success: true, data: await certificationsRepository.list({ activeOnly: true }) });
}

export async function listEnquiryOptions(_req, res) {
  res.json({ success: true, data: await enquiryOptionsRepository.list({ activeOnly: true }) });
}

export async function listSocialLinks(_req, res) {
  res.json({ success: true, data: await socialLinksRepository.list({ activeOnly: true }) });
}

export async function listNavItems(_req, res) {
  res.json({ success: true, data: await navigationItemsRepository.list({ activeOnly: true }) });
}

export async function listFaqs(_req, res) {
  res.json({ success: true, data: await faqsRepository.list({ activeOnly: true }) });
}

export async function getSiteSettings(_req, res) {
  res.json({ success: true, data: await settingsRepository.public() });
}

export async function getContentBlocks(_req, res) {
  res.json({ success: true, data: await contentBlocksRepository.all() });
}

export async function listAssessments(_req, res) {
  res.json({ success: true, data: await assessmentRepository.catalogue({ activeOnly: true }) });
}

/**
 * GET /api/home
 * Single aggregated payload the public homepage needs - one round trip
 * instead of a dozen.
 */
export async function getHome(_req, res) {
  const [
    content,
    settings,
    stats,
    whyFeatures,
    certifications,
    services,
    destinations,
    gallery,
    testimonials,
    videos,
    processSteps,
    enquiryOptions,
    socialLinks,
    navigation,
  ] = await Promise.all([
    contentBlocksRepository.all(),
    settingsRepository.public(),
    statsRepository.list({ activeOnly: true }),
    whyFeaturesRepository.list({ activeOnly: true }),
    certificationsRepository.list({ activeOnly: true }),
    servicesRepository.list({ activeOnly: true }),
    destinationsRepository.list({ activeOnly: true }),
    galleryRepository.list({ activeOnly: true }),
    testimonialsRepository.list({ activeOnly: true }),
    videosRepository.list({ activeOnly: true }),
    processStepsRepository.list({ activeOnly: true }),
    enquiryOptionsRepository.list({ activeOnly: true }),
    socialLinksRepository.list({ activeOnly: true }),
    navigationItemsRepository.list({ activeOnly: true }),
  ]);

  res.json({
    success: true,
    data: {
      content,
      settings,
      stats,
      whyFeatures,
      certifications,
      services,
      destinations,
      gallery,
      testimonials,
      videos,
      processSteps,
      enquiryOptions,
      socialLinks,
      navigation,
    },
  });
}

export default {
  listServices,
  listDestinations,
  listGallery,
  listTestimonials,
  listVideos,
  listProcessSteps,
  listStats,
  listWhyFeatures,
  listCertifications,
  listEnquiryOptions,
  listSocialLinks,
  listNavItems,
  getSiteSettings,
  getContentBlocks,
  getHome,
  listAssessments,
};
