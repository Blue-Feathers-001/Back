import express from 'express';
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);

// Get announcements (all authenticated users)
router.get('/', getAnnouncements);

// Create, update, delete (admin only)
router.post('/', authorize('admin'), createAnnouncement);
router.put('/:id', authorize('admin'), updateAnnouncement);
router.delete('/:id', authorize('admin'), deleteAnnouncement);

export default router;
