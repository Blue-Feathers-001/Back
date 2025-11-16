import mongoose, { Document, Schema } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  type: 'general' | 'urgent' | 'maintenance' | 'event' | 'promotion';
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['general', 'urgent', 'maintenance', 'event', 'promotion'],
      default: 'general',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Index for faster queries
AnnouncementSchema.index({ isActive: 1, createdAt: -1 });
AnnouncementSchema.index({ expiresAt: 1 });

export default mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
