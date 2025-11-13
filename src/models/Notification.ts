import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'membership_expiry' | 'payment_success' | 'payment_failed' | 'membership_activated' | 'general' | 'promotion';
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  metadata?: {
    membershipEndDate?: Date;
    packageName?: string;
    amount?: number;
    orderId?: string;
    actionUrl?: string;
    [key: string]: any;
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  markAsRead(): Promise<INotification>;
}

export interface INotificationModel extends mongoose.Model<INotification> {
  createMembershipExpiryNotification(
    userId: mongoose.Types.ObjectId,
    title: string,
    message: string,
    membershipEndDate: Date,
    packageName: string,
    priority?: 'low' | 'medium' | 'high'
  ): Promise<INotification>;
  createPaymentNotification(
    userId: mongoose.Types.ObjectId,
    title: string,
    message: string,
    isSuccess: boolean,
    amount: number,
    orderId: string
  ): Promise<INotification>;
  markAllAsReadForUser(userId: mongoose.Types.ObjectId): Promise<any>;
  getUnreadCount(userId: mongoose.Types.ObjectId): Promise<number>;
  deleteOldReadNotifications(daysOld?: number): Promise<any>;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: {
        values: ['membership_expiry', 'payment_success', 'payment_failed', 'membership_activated', 'general', 'promotion'],
        message: '{VALUE} is not a valid notification type',
      },
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: '{VALUE} is not a valid priority level',
      },
      default: 'medium',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Method to mark notification as read
notificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  return this.save();
};

// Static method to create membership expiry notification
notificationSchema.statics.createMembershipExpiryNotification = function (
  userId: mongoose.Types.ObjectId,
  title: string,
  message: string,
  membershipEndDate: Date,
  packageName: string,
  priority: 'low' | 'medium' | 'high' = 'high'
) {
  return this.create({
    user: userId,
    title,
    message,
    type: 'membership_expiry',
    priority,
    metadata: {
      membershipEndDate,
      packageName,
      actionUrl: '/dashboard/renew',
    },
  });
};

// Static method to create payment notification
notificationSchema.statics.createPaymentNotification = function (
  userId: mongoose.Types.ObjectId,
  title: string,
  message: string,
  isSuccess: boolean,
  amount: number,
  orderId: string
) {
  return this.create({
    user: userId,
    title,
    message,
    type: isSuccess ? 'payment_success' : 'payment_failed',
    priority: isSuccess ? 'medium' : 'high',
    metadata: {
      amount,
      orderId,
      actionUrl: isSuccess ? '/dashboard/membership' : '/dashboard/renew',
    },
  });
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsReadForUser = function (userId: mongoose.Types.ObjectId) {
  return this.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true } }
  );
};

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = function (userId: mongoose.Types.ObjectId) {
  return this.countDocuments({ user: userId, isRead: false });
};

// Static method to delete old read notifications
notificationSchema.statics.deleteOldReadNotifications = function (daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    isRead: true,
    createdAt: { $lt: cutoffDate },
  });
};

const Notification = mongoose.model<INotification, INotificationModel>('Notification', notificationSchema);

export default Notification;
