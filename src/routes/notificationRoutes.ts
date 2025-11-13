import express from 'express';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  sendBulkNotifications,
  getNotificationStats,
  cleanupOldNotifications,
} from '../controllers/notificationController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// User routes
router.get('/', protect, getMyNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.patch('/:id/read', protect, markAsRead);
router.patch('/mark-all-read', protect, markAllAsRead);
router.delete('/:id', protect, deleteNotification);

// Admin routes
router.post('/', protect, authorize('admin'), createNotification);
router.post('/bulk', protect, authorize('admin'), sendBulkNotifications);
router.get('/stats', protect, authorize('admin'), getNotificationStats);
router.delete('/cleanup', protect, authorize('admin'), cleanupOldNotifications);

export default router;
