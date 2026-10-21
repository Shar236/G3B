import { Router } from 'express';
import * as content from '../controllers/contentController.js';
import * as seo from '../controllers/publicSeoController.js';
import { createEnquiry } from '../controllers/enquiryController.js';
import { createEnquiryRules } from '../validators/enquiryValidators.js';
import validate from '../middleware/validate.js';
import { enquiryRateLimiter } from '../middleware/rateLimit.js';
import asyncHandler from '../utils/asyncHandler.js';
import { subscribe, unsubscribe } from '../controllers/subscriberController.js';
import { subscribeRules, unsubscribeRules } from '../validators/subscriberValidators.js';

import { createPartnerEnquiry } from '../controllers/partnerController.js';
import { createPartnerEnquiryRules } from '../validators/partnerValidators.js';

const router = Router();

// Aggregated homepage payload -------------------------------------------------
router.get('/home', asyncHandler(content.getHome));

// Published SEO metadata (rendered into the public HTML) ----------------------
router.get('/seo/context', asyncHandler(seo.getSeoContext));
router.get('/seo/pages', asyncHandler(seo.listPublicPages));
router.get('/seo/page', asyncHandler(seo.getPublicPageSeo));

// Individual content collections ---------------------------------------------
router.get('/services', asyncHandler(content.listServices));
router.get('/destinations', asyncHandler(content.listDestinations));
router.get('/gallery', asyncHandler(content.listGallery));
router.get('/testimonials', asyncHandler(content.listTestimonials));
router.get('/videos', asyncHandler(content.listVideos));
router.get('/process-steps', asyncHandler(content.listProcessSteps));
router.get('/stats', asyncHandler(content.listStats));
router.get('/why-features', asyncHandler(content.listWhyFeatures));
router.get('/certifications', asyncHandler(content.listCertifications));
router.get('/enquiry-options', asyncHandler(content.listEnquiryOptions));
router.get('/social-links', asyncHandler(content.listSocialLinks));
router.get('/navigation', asyncHandler(content.listNavItems));
router.get('/faqs', asyncHandler(content.listFaqs));
router.get('/site-settings', asyncHandler(content.getSiteSettings));
router.get('/content-blocks', asyncHandler(content.getContentBlocks));

// Public enquiry / free counselling submission ---------------------------------
router.post('/enquiries', enquiryRateLimiter, createEnquiryRules, validate, asyncHandler(createEnquiry));
router.post('/counselling', enquiryRateLimiter, createEnquiryRules, validate, asyncHandler(createEnquiry));
router.post('/partner-enquiries', enquiryRateLimiter, createPartnerEnquiryRules, validate, asyncHandler(createPartnerEnquiry));
router.post('/subscribers', enquiryRateLimiter, subscribeRules, validate, asyncHandler(subscribe));
router.post('/subscribers/unsubscribe', enquiryRateLimiter, unsubscribeRules, validate, asyncHandler(unsubscribe));

export default router;
