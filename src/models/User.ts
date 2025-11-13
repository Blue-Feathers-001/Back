import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: 'admin' | 'user';
  membershipStatus: 'active' | 'inactive' | 'expired' | 'grace_period';
  membershipPackage?: mongoose.Types.ObjectId;
  membershipPlan?: string;
  membershipStartDate?: Date;
  membershipEndDate?: Date;
  gracePeriodEndDate?: Date;
  autoRenewal: boolean;
  paymentHistory: mongoose.Types.ObjectId[];
  lastPaymentDate?: Date;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
    reminderDays: number[];
  };
  googleId?: string;
  authProvider?: 'local' | 'google';
  avatar?: string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getDaysUntilExpiry(): number;
  isInGracePeriod(): boolean;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    membershipStatus: {
      type: String,
      enum: ['active', 'inactive', 'expired', 'grace_period'],
      default: 'inactive',
    },
    membershipPackage: {
      type: Schema.Types.ObjectId,
      ref: 'MembershipPackage',
    },
    membershipPlan: {
      type: String,
      enum: ['basic', 'premium', 'vip'],
    },
    membershipStartDate: {
      type: Date,
    },
    membershipEndDate: {
      type: Date,
    },
    gracePeriodEndDate: {
      type: Date,
    },
    autoRenewal: {
      type: Boolean,
      default: false,
    },
    paymentHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Payment',
      },
    ],
    lastPaymentDate: {
      type: Date,
    },
    notificationPreferences: {
      email: {
        type: Boolean,
        default: true,
      },
      sms: {
        type: Boolean,
        default: false,
      },
      inApp: {
        type: Boolean,
        default: true,
      },
      reminderDays: {
        type: [Number],
        default: [7, 3, 1],
      },
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    next();
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get days until membership expiry
UserSchema.methods.getDaysUntilExpiry = function (): number {
  if (!this.membershipEndDate) return 0;
  const today = new Date();
  const endDate = new Date(this.membershipEndDate);
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

// Check if user is in grace period
UserSchema.methods.isInGracePeriod = function (): boolean {
  if (!this.gracePeriodEndDate) return false;
  const today = new Date();
  return today <= new Date(this.gracePeriodEndDate);
};

export default mongoose.model<IUser>('User', UserSchema);
