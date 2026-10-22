import mediaGalleryRepository from '../repositories/mediaGalleryRepository.js';
import ApiError from '../utils/ApiError.js';

/**
 * GET /api/media/overview
 * Overview payload for the main media hub (/about/media):
 * featured items, category summaries, and high-level stats.
 */
export async function getPublicMediaOverview(_req, res) {
  const [featuredPhotos, featuredVideos, stats, photoCategories, videoCategories] = await Promise.all([
    mediaGalleryRepository.getFeatured({ type: 'photo', limit: 6 }),
    mediaGalleryRepository.getFeatured({ type: 'video', limit: 6 }),
    mediaGalleryRepository.getStats(),
    mediaGalleryRepository.getCategories('photo'),
    mediaGalleryRepository.getCategories('video'),
  ]);

  // Only return categories that actually have published media
  const activePhotoCats = photoCategories.filter((c) => c.publishedCount > 0);
  const activeVideoCats = videoCategories.filter((c) => c.publishedCount > 0);

  res.json({
    success: true,
    data: {
      featuredPhotos,
      featuredVideos,
      stats: {
        totalPhotos: stats.publishedPhotos,
        totalVideos: stats.publishedVideos,
      },
      categories: {
        photos: activePhotoCats,
        videos: activeVideoCats,
      },
      recentHighlights: stats.recentMedia.filter((item) => item.status === 'published').slice(0, 8),
    },
  });
}

/**
 * GET /api/media/photos
 * Public photos gallery with category filtering, search, and pagination.
 */
export async function listPublicPhotos(req, res) {
  const { category, search, page = 1, perPage = 18, sort = 'order' } = req.query;

  const result = await mediaGalleryRepository.list({
    type: 'photo',
    status: 'published',
    category,
    search,
    page: Number(page) || 1,
    perPage: Math.min(Number(perPage) || 18, 60),
    sort,
  });

  const categories = await mediaGalleryRepository.getCategories('photo');
  const activeCategories = categories.filter((c) => c.publishedCount > 0);

  res.json({
    success: true,
    data: result.items,
    pagination: result.pagination,
    categories: activeCategories,
  });
}

/**
 * GET /api/media/videos
 * Public videos gallery with category filtering, search, and pagination.
 */
export async function listPublicVideos(req, res) {
  const { category, search, page = 1, perPage = 12, sort = 'order' } = req.query;

  const result = await mediaGalleryRepository.list({
    type: 'video',
    status: 'published',
    category,
    search,
    page: Number(page) || 1,
    perPage: Math.min(Number(perPage) || 12, 40),
    sort,
  });

  const categories = await mediaGalleryRepository.getCategories('video');
  const activeCategories = categories.filter((c) => c.publishedCount > 0);

  res.json({
    success: true,
    data: result.items,
    pagination: result.pagination,
    categories: activeCategories,
  });
}

/**
 * GET /api/media/categories
 * Returns active categories with published item counts.
 */
export async function getPublicMediaCategories(req, res) {
  const type = req.query.type || 'all';
  const categories = await mediaGalleryRepository.getCategories(type);
  const active = categories.filter((c) => c.publishedCount > 0);
  res.json({
    success: true,
    data: active,
  });
}

/**
 * GET /api/media/item/:slugOrId
 * Public single media item details.
 */
export async function getPublicMediaItem(req, res) {
  const { slugOrId } = req.params;
  let item = null;
  if (/^\d+$/.test(slugOrId)) {
    item = await mediaGalleryRepository.getById(Number(slugOrId));
  } else {
    item = await mediaGalleryRepository.getBySlug(slugOrId);
  }

  if (!item || item.status !== 'published') {
    throw ApiError.notFound('Media item not found or not published.');
  }

  res.json({
    success: true,
    data: item,
  });
}
