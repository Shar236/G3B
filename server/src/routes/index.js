import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import publicRoutes from './publicRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
// Public content + enquiry routes are mounted at the API root.
router.use('/', publicRoutes);

export default router;
