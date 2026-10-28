import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import env from '../config/env.js';
import { youtubeSyncService } from '../services/youtubeSyncService.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.get('/youtube-sync', asyncHandler(async (req, res) => {
  if (!env.cronSecret) throw new ApiError(503, 'Scheduled jobs are not configured.');

  const authorization = req.get('authorization') || '';
  const expected = Buffer.from(`Bearer ${env.cronSecret}`);
  const supplied = Buffer.from(authorization);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new ApiError(401, 'Unauthorized.');
  }

  res.json({ success: true, data: await youtubeSyncService.refreshIfDue() });
}));

export default router;
