import mongoose, { Document, Schema } from 'mongoose';

export interface IMembershipPackage extends Document {
  name: string;
  description: string;
  durationMonths: number;
  price: number;
  features: string[];
  isActive: boolean;
  category: 'basic' | 'premium' | 'vip' | 'custom';
  maxMembers?: number; // Optional limit on number of members
  currentMembers: number;
  discount?: number; // Optional discount percentage
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const membershipPackageSchema = new Schema<IMembershipPackage>(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
      maxlength: [100, 'Package name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Package description is required'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    durationMonths: {
      type: Number,
      required: [true, 'Duration in months is required'],
      min: [1, 'Duration must be at least 1 month'],
      max: [24, 'Duration cannot exceed 24 months'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    features: {
      type: [String],
      default: [],
      validate: {
        validator: function (features: string[]) {
          return features.length > 0;
        },
        message: 'At least one feature is required',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      enum: {
        values: ['basic', 'premium', 'vip', 'custom'],
        message: '{VALUE} is not a valid category',
      },
      default: 'custom',
    },
    maxMembers: {
      type: Number,
      min: [0, 'Max members cannot be negative'],
    },
    currentMembers: {
      type: Number,
      default: 0,
      min: [0, 'Current members cannot be negative'],
    },
    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
membershipPackageSchema.index({ isActive: 1, category: 1 });
membershipPackageSchema.index({ createdAt: -1 });

// Virtual for discounted price
membershipPackageSchema.virtual('discountedPrice').get(function () {
  if (this.discount && this.discount > 0) {
    return this.price - (this.price * this.discount) / 100;
  }
  return this.price;
});

// Virtual for availability
membershipPackageSchema.virtual('isAvailable').get(function () {
  if (!this.isActive) return false;
  if (this.maxMembers && this.currentMembers >= this.maxMembers) return false;
  return true;
});

// Ensure virtuals are included in JSON
membershipPackageSchema.set('toJSON', { virtuals: true });
membershipPackageSchema.set('toObject', { virtuals: true });

const MembershipPackage = mongoose.model<IMembershipPackage>(
  'MembershipPackage',
  membershipPackageSchema
);

export default MembershipPackage;
