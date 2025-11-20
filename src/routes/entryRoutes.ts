import express from 'express';
import { scanEntry, getEntryLogs, getEntryStats } from '../controllers/entryController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Public route - scan QR code at entrance
router.post('/scan', scanEntry);

// Admin routes - view entry logs and stats
router.get('/logs', protect, authorize('admin'), getEntryLogs);
router.get('/stats', protect, authorize('admin'), getEntryStats);

export default router;
