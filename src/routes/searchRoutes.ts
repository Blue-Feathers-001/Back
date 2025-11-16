import express from 'express';
import { globalSearch } from '../controllers/searchController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Global search (admin only)
router.get('/', protect, authorize('admin'), globalSearch);

export default router;
