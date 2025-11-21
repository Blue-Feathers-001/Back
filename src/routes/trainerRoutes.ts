import express from 'express';
import {
  getActiveMembers,
  getAttendanceStats,
  getCurrentlyCheckedIn,
  getTrainers,
  createTrainer,
  toggleTrainerStatus,
} from '../controllers/trainerController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Trainer-accessible routes
router.get('/members', authorize('trainer', 'admin'), getActiveMembers);
router.get('/attendance/stats', authorize('trainer', 'admin'), getAttendanceStats);
router.get('/attendance/current', authorize('trainer', 'admin'), getCurrentlyCheckedIn);

// Admin-only trainer management routes
router.get('/', authorize('admin'), getTrainers);
router.post('/', authorize('admin'), createTrainer);
router.patch('/:id/status', authorize('admin'), toggleTrainerStatus);

export default router;
