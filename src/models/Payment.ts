import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  user: mongoose.Types.ObjectId;
  package: mongoose.Types.ObjectId;
  orderId: string; // PayHere order ID
  merchantId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'refunded';
  paymentMethod: string;
  payHerePaymentId?: string;
  payHereStatusCode?: string;
  payHereCardHolderName?: string;
  payHereCardNo?: string;
  statusMessage?: string;
  membershipStartDate?: Date;
  membershipEndDate?: Date;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    rawResponse?: any;
  };
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  markAsSuccess(payHereData: any): Promise<IPayment>;
  markAsFailed(reason: string, payHereData?: any): Promise<IPayment>;
  markAsCancelled(): Promise<IPayment>;
  processRefund(amount: number, reason: string): Promise<IPayment>;
}

const paymentSchema = new Schema<IPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    package: {
      type: Schema.Types.ObjectId,
      ref: 'MembershipPackage',
      required: [true, 'Package is required'],
    },
    orderId: {
      type: String,
      required: [true, 'Order ID is required'],
      unique: true,
      index: true,
    },
    merchantId: {
      type: String,
      required: [true, 'Merchant ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'LKR',
      enum: ['LKR', 'USD'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'success', 'failed', 'cancelled', 'refunded'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      default: 'PayHere',
    },
    payHerePaymentId: {
      type: String,
      index: true,
    },
    payHereStatusCode: {
      type: String,
    },
    payHereCardHolderName: {
      type: String,
    },
    payHereCardNo: {
      type: String,
    },
    statusMessage: {
      type: String,
    },
    membershipStartDate: {
      type: Date,
    },
    membershipEndDate: {
      type: Date,
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      rawResponse: Schema.Types.Mixed,
    },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative'],
    },
    refundReason: {
      type: String,
    },
    refundedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ createdAt: -1 });

// Method to mark payment as successful
paymentSchema.methods.markAsSuccess = function (payHereData: any) {
  this.status = 'success';
  this.payHerePaymentId = payHereData.payment_id;
  this.payHereStatusCode = payHereData.status_code;
  this.payHereCardHolderName = payHereData.card_holder_name;
  this.payHereCardNo = payHereData.card_no;
  this.statusMessage = payHereData.status_message || 'Payment successful';
  this.metadata.rawResponse = payHereData;
  return this.save();
};

// Method to mark payment as failed
paymentSchema.methods.markAsFailed = function (reason: string, payHereData?: any) {
  this.status = 'failed';
  this.statusMessage = reason;
  if (payHereData) {
    this.payHereStatusCode = payHereData.status_code;
    this.metadata.rawResponse = payHereData;
  }
  return this.save();
};

// Method to mark payment as cancelled
paymentSchema.methods.markAsCancelled = function () {
  this.status = 'cancelled';
  this.statusMessage = 'Payment cancelled by user';
  return this.save();
};

// Method to process refund
paymentSchema.methods.processRefund = function (amount: number, reason: string) {
  this.status = 'refunded';
  this.refundAmount = amount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  return this.save();
};

const Payment = mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;
