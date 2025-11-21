import express from 'express';
import {
  submitFeedback,
  getAllFeedback,
  updateFeedbackStatus,
  addAdminResponse,
  deleteFeedback,
} from '../controllers/feedbackController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Public/Authenticated route - submit feedback
// Can be used by both anonymous and logged-in users
router.post('/submit', submitFeedback);

// Admin-only routes
router.get('/', protect, authorize('admin'), getAllFeedback);
router.put('/:feedbackId/status', protect, authorize('admin'), updateFeedbackStatus);
router.put('/:feedbackId/response', protect, authorize('admin'), addAdminResponse);
router.delete('/:feedbackId', protect, authorize('admin'), deleteFeedback);

export default router;
