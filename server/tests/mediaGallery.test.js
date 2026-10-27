import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { pingDatabase, closePool } from '../src/config/db.js'
import env from '../src/config/env.js'

const app = createApp()
let dbAvailable = false
let adminSessionData = null
let testItemId = null

beforeAll(async () => {
  try {
    await pingDatabase()
    dbAvailable = true
  } catch {
    dbAvailable = false
  }

  if (dbAvailable) {
    try {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: env.admin.email, password: env.admin.password })

      if (login.status === 200) {
        adminSessionData = {
          cookies: login.headers['set-cookie'],
          csrf: login.body.data?.csrfToken || '',
        }
      }
    } catch {
      adminSessionData = null
    }
  }
}, 40000)

afterAll(async () => {
  await closePool().catch(() => {})
})

describe('Media Gallery & Management System API', () => {
  describe('Public Media API Endpoints', () => {
    it('GET /api/media/overview returns featured highlights, stats, and active categories', async () => {
      const res = await request(app).get('/api/media/overview')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('featuredPhotos')
      expect(res.body.data).toHaveProperty('featuredVideos')
      expect(res.body.data).toHaveProperty('stats')
      expect(Array.isArray(res.body.data.featuredPhotos)).toBe(true)
      expect(Array.isArray(res.body.data.featuredVideos)).toBe(true)
    })

    it('GET /api/media/photos returns paginated published photos and category list', async () => {
      const res = await request(app).get('/api/media/photos?page=1&perPage=10')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body).toHaveProperty('pagination')
      expect(res.body.pagination).toHaveProperty('total')
      expect(Array.isArray(res.body.categories)).toBe(true)

      for (const item of res.body.data) {
        expect(item.media_type).toBe('photo')
        expect(item.status).toBe('published')
      }
    })

    it('GET /api/media/photos filters by category', async () => {
      const res = await request(app).get('/api/media/photos?category=Events+%26+Activities')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      for (const item of res.body.data) {
        expect(item.category_name).toBe('Events & Activities')
      }
    })

    it('GET /api/media/videos returns paginated published videos', async () => {
      const res = await request(app).get('/api/media/videos?page=1&perPage=10')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body).toHaveProperty('pagination')

      for (const item of res.body.data) {
        expect(item.media_type).toBe('video')
        expect(item.status).toBe('published')
      }
    })

    it('GET /api/media/categories returns media category hierarchy', async () => {
      const res = await request(app).get('/api/media/categories')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThan(0)
    })
  })

  describe('Admin Media Gallery Protection and Operations', () => {
    it('rejects unauthenticated requests to /api/admin/media-gallery', async () => {
      const res = await request(app).get('/api/admin/media-gallery')
      expect(res.status).toBe(401)
    })

    it('rejects unauthenticated requests to /api/admin/media-gallery/stats', async () => {
      const res = await request(app).get('/api/admin/media-gallery/stats')
      expect(res.status).toBe(401)
    })

    it('allows authenticated admin to fetch gallery operational stats', async (context) => {
      if (!adminSessionData) return context.skip()
      const res = await request(app)
        .get('/api/admin/media-gallery/stats')
        .set('Cookie', adminSessionData.cookies)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('publishedPhotos')
      expect(res.body.data).toHaveProperty('publishedVideos')
      expect(res.body.data).toHaveProperty('draftItems')
      expect(res.body.data).toHaveProperty('featuredItems')
    })

    it('allows authenticated admin to create, update, and delete a media item', async (context) => {
      if (!adminSessionData) return context.skip()

      // 1. Create a media item (video)
      const createRes = await request(app)
        .post('/api/admin/media-gallery')
        .set('Cookie', adminSessionData.cookies)
        .set('x-csrf-token', adminSessionData.csrf)
        .send({
          media_type: 'video',
          title: 'Automated Test Guidance Video',
          description: 'A test video created during integration tests',
          external_video_url: 'https://www.youtube.com/watch?v=fET2RhoejWA',
          thumbnail_url: 'https://img.youtube.com/vi/fET2RhoejWA/maxresdefault.jpg',
          duration: '10:30',
          is_featured: false,
          status: 'draft',
        })

      expect(createRes.status).toBe(201)
      expect(createRes.body.success).toBe(true)
      expect(createRes.body.data.title).toBe('Automated Test Guidance Video')
      testItemId = createRes.body.data.id

      // 2. Update the item
      const updateRes = await request(app)
        .patch(`/api/admin/media-gallery/${testItemId}`)
        .set('Cookie', adminSessionData.cookies)
        .set('x-csrf-token', adminSessionData.csrf)
        .send({
          title: 'Automated Test Guidance Video (Updated)',
          status: 'published',
          is_featured: true,
        })

      expect(updateRes.status).toBe(200)
      expect(updateRes.body.data.title).toBe('Automated Test Guidance Video (Updated)')
      expect(updateRes.body.data.status).toBe('published')
      expect(Boolean(updateRes.body.data.is_featured)).toBe(true)

      // 3. Delete the item
      const deleteRes = await request(app)
        .delete(`/api/admin/media-gallery/${testItemId}`)
        .set('Cookie', adminSessionData.cookies)
        .set('x-csrf-token', adminSessionData.csrf)

      expect(deleteRes.status).toBe(200)
      expect(deleteRes.body.success).toBe(true)
    })
  })
})
