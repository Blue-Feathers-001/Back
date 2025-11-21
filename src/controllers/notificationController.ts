import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { io } from '../server';

// @desc    Get all notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const { limit = 20, page = 1, isRead } = req.query;

    const query: any = { user: (req as any).user._id };

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount((req as any).user._id);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data: notifications,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message,
    });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const count = await Notification.getUnreadCount((req as any).user._id);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message,
    });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Check if notification belongs to user
    if (notification.user.toString() !== (req as any).user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this notification',
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message,
    });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/mark-all-read
// @access  Private
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    await Notification.markAllAsReadForUser((req as any).user._id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error.message,
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Check if notification belongs to user
    if (notification.user.toString() !== (req as any).user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification',
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message,
    });
  }
};

// @desc    Create notification (Admin only)
// @route   POST /api/notifications
// @access  Admin only
export const createNotification = async (req: Request, res: Response) => {
  try {
    const { userId, title, message, type, priority, metadata } = req.body;

    if (!userId || !title || !message || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type,
      priority: priority || 'medium',
      metadata: metadata || {},
    });

    // Emit real-time notification via Socket.IO
    io.to(`user:${userId}`).emit('notification:new', {
      _id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    });

    // Also emit unread count update
    const unreadCount = await Notification.getUnreadCount(userId);
    io.to(`user:${userId}`).emit('notification:unread-count', { count: unreadCount });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
      error: error.message,
    });
  }
};

// @desc    Send bulk notifications to multiple users (Admin only)
// @route   POST /api/notifications/bulk
// @access  Admin only
export const sendBulkNotifications = async (req: Request, res: Response) => {
  try {
    const { userIds, title, message, type, priority } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of user IDs',
      });
    }

    if (!title || !message || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, message, and type',
      });
    }

    const notifications = userIds.map((userId) => ({
      user: userId,
      title,
      message,
      type,
      priority: priority || 'medium',
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    // OPTIMIZED: Batch calculate unread counts using aggregation instead of N+1 queries
    const unreadCounts = await Notification.aggregate([
      { $match: { user: { $in: userIds.map(id => new (require('mongoose').Types.ObjectId)(id)) }, isRead: false } },
      { $group: { _id: '$user', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(unreadCounts.map((u: any) => [u._id.toString(), u.count]));

    // Emit real-time notifications via Socket.IO to each user
    for (const notification of createdNotifications) {
      io.to(`user:${notification.user}`).emit('notification:new', {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });

      // OPTIMIZED: Use pre-calculated count from aggregation
      const unreadCount = countMap.get(notification.user.toString()) || 0;
      io.to(`user:${notification.user}`).emit('notification:unread-count', { count: unreadCount });
    }

    res.status(201).json({
      success: true,
      message: `Sent ${createdNotifications.length} notifications successfully`,
      data: { count: createdNotifications.length },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error sending bulk notifications',
      error: error.message,
    });
  }
};

// @desc    Get notification statistics (Admin only)
// @route   GET /api/notifications/stats
// @access  Admin only
export const getNotificationStats = async (req: Request, res: Response) => {
  try {
    const totalNotifications = await Notification.countDocuments();
    const unreadNotifications = await Notification.countDocuments({ isRead: false });
    const readNotifications = await Notification.countDocuments({ isRead: true });

    const notificationsByType = await Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const recentNotifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      data: {
        totalNotifications,
        unreadNotifications,
        readNotifications,
        readRate: totalNotifications > 0 ? (readNotifications / totalNotifications) * 100 : 0,
        notificationsByType,
        recentNotifications,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notification statistics',
      error: error.message,
    });
  }
};

// @desc    Delete old read notifications (Admin only - for cleanup)
// @route   DELETE /api/notifications/cleanup
// @access  Admin only
export const cleanupOldNotifications = async (req: Request, res: Response) => {
  try {
    const { daysOld = 30 } = req.query;

    const result = await Notification.deleteOldReadNotifications(Number(daysOld));

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old notifications`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error cleaning up notifications',
      error: error.message,
    });
  }
};
