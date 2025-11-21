import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
  user?: mongoose.Types.ObjectId;
  name: string;
  email: string;
  category: 'Suggestion' | 'Complaint' | 'Compliment' | 'Facility Issue' | 'Equipment Issue' | 'Other';
  message: string;
  isAnonymous: boolean;
  status: 'New' | 'Under Review' | 'Resolved';
  adminResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Suggestion', 'Complaint', 'Compliment', 'Facility Issue', 'Equipment Issue', 'Other'],
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['New', 'Under Review', 'Resolved'],
      default: 'New',
    },
    adminResponse: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// ===== PERFORMANCE INDEXES =====
FeedbackSchema.index({ status: 1 });
FeedbackSchema.index({ category: 1 });
FeedbackSchema.index({ user: 1 });
FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ status: 1, createdAt: -1 }); // Admin filtering
FeedbackSchema.index({ category: 1, status: 1 }); // Category + status filtering

export default mongoose.model<IFeedback>('Feedback', FeedbackSchema);
