import express from 'express';
import {
  scanEntry,
  getEntryLogs,
  getEntryStats,
  getUserCheckInHistory,
  getCurrentlyInGym,
  getFlaggedUsers,
  clearUserFlag,
} from '../controllers/entryController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Public route - scan QR code at entrance
router.post('/scan', scanEntry);

// Authenticated user route - get own check-in history (only allowed entries)
router.get('/my-history', protect, getUserCheckInHistory);

// Admin and Trainer routes - view entry logs and stats
router.get('/logs', protect, authorize('admin', 'trainer'), getEntryLogs);
router.get('/stats', protect, authorize('admin', 'trainer'), getEntryStats);

// Admin and Trainer routes - currently in gym
router.get('/currently-in-gym', protect, authorize('admin', 'trainer'), getCurrentlyInGym);

// Admin and Trainer routes - flagged users
router.get('/flagged', protect, authorize('admin', 'trainer'), getFlaggedUsers);

// Admin only route - clear user flag
router.put('/flagged/:userId/clear', protect, authorize('admin'), clearUserFlag);

export default router;
