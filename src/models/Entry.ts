import mongoose, { Document, Schema } from 'mongoose';

export interface IEntry extends Document {
  user: mongoose.Types.ObjectId;
  timestamp: Date;
  status: 'allowed' | 'denied';
  reason: string;
  membershipStatus: string;
  scanLocation: string;
}

const EntrySchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['allowed', 'denied'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    membershipStatus: {
      type: String,
      required: true,
    },
    scanLocation: {
      type: String,
      default: 'main-entrance',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
EntrySchema.index({ user: 1, timestamp: -1 });
EntrySchema.index({ timestamp: -1 });
EntrySchema.index({ status: 1 });

export default mongoose.model<IEntry>('Entry', EntrySchema);
