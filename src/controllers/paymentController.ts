import { Request, Response } from 'express';
import crypto from 'crypto';
import Payment from '../models/Payment';
import User from '../models/User';
import MembershipPackage from '../models/MembershipPackage';
import Notification from '../models/Notification';
import { sendEmail, sendMembershipActivationEmail } from '../utils/emailService';

// PayHere MD5 Hash Generation
const generatePayHereHash = (
  merchantId: string,
  orderId: string,
  amount: string,
  currency: string,
  merchantSecret: string
): string => {
  const hashedSecret = crypto
    .createHash('md5')
    .update(merchantSecret)
    .digest('hex')
    .toUpperCase();

  const amountFormatted = parseFloat(amount).toFixed(2);
  const hashString = `${merchantId}${orderId}${amountFormatted}${currency}${hashedSecret}`;

  return crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();
};

// @desc    Initiate payment for membership package
// @route   POST /api/payments/initiate
// @access  Private
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.body;

    // Get package details
    const package_ = await MembershipPackage.findById(packageId);

    if (!package_) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    if (!package_.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This package is currently not available',
      });
    }

    // Check if package has member limit
    if (package_.maxMembers && package_.currentMembers >= package_.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'This package has reached its maximum capacity',
      });
    }

    // Get user details
    const user = await User.findById((req as any).user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate unique order ID
    const orderId = `ORDER_${Date.now()}_${user._id}`;

    // Calculate amount (apply discount if available)
    const amount = package_.discount && package_.discount > 0
      ? package_.price - (package_.price * package_.discount) / 100
      : package_.price;

    // PayHere configuration
    const merchantId = process.env.PAYHERE_MERCHANT_ID!;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET!;
    const currency = 'LKR';

    // Debug logging
    console.log('=== PayHere Hash Debug ===');
    console.log('Merchant ID:', merchantId);
    console.log('Order ID:', orderId);
    console.log('Amount:', amount.toFixed(2));
    console.log('Currency:', currency);
    console.log('Merchant Secret (first 10 chars):', merchantSecret.substring(0, 10) + '...');

    // Generate hash
    const hash = generatePayHereHash(
      merchantId,
      orderId,
      amount.toString(),
      currency,
      merchantSecret
    );

    console.log('Generated Hash:', hash);
    console.log('========================');

    // Create pending payment record
    const payment = await Payment.create({
      user: user._id,
      package: package_._id,
      orderId,
      merchantId,
      amount,
      currency,
      status: 'pending',
      paymentMethod: 'PayHere',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    // PayHere payment data
    const paymentData = {
      sandbox: process.env.NODE_ENV !== 'production',
      merchant_id: merchantId,
      return_url: `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      notify_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/notify`,
      order_id: orderId,
      items: package_.name,
      currency,
      amount: amount.toFixed(2),
      first_name: user.name.split(' ')[0] || user.name,
      last_name: user.name.split(' ')[1] || '',
      email: user.email,
      phone: user.phone || '',
      address: '',
      city: '',
      country: 'Sri Lanka',
      hash,
      custom_1: user._id.toString(),
      custom_2: package_._id.toString(),
    };

    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        payment: payment,
        paymentData: paymentData,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error initiating payment',
      error: error.message,
    });
  }
};

// @desc    PayHere payment notification (webhook)
// @route   POST /api/payments/notify
// @access  Public (PayHere webhook)
export const paymentNotify = async (req: Request, res: Response) => {
  try {
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      payment_id,
      card_holder_name,
      card_no,
      status_message,
      custom_1: userId,
      custom_2: packageId,
    } = req.body;

    // Verify hash
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET!;
    const hashedSecret = crypto
      .createHash('md5')
      .update(merchantSecret)
      .digest('hex')
      .toUpperCase();

    const localHash = crypto
      .createHash('md5')
      .update(
        `${merchant_id}${order_id}${parseFloat(payhere_amount).toFixed(2)}${payhere_currency}${status_code}${hashedSecret}`
      )
      .digest('hex')
      .toUpperCase();

    if (localHash !== md5sig) {
      console.error('Payment hash verification failed');
      return res.status(400).send('Invalid hash');
    }

    // Find payment record
    const payment = await Payment.findOne({ orderId: order_id });

    if (!payment) {
      console.error('Payment record not found');
      return res.status(404).send('Payment not found');
    }

    // Update payment based on status
    if (status_code === '2') {
      // Success
      await payment.markAsSuccess({
        payment_id,
        status_code,
        card_holder_name,
        card_no,
        status_message,
      });

      // Get user and package
      const user = await User.findById(userId);
      const package_ = await MembershipPackage.findById(packageId);

      if (user && package_) {
        // Calculate membership dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + package_.durationMonths);

        const gracePeriodEnd = new Date(endDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 5); // 5 days grace period

        // Update user membership
        user.membershipPackage = package_._id as any;
        user.membershipPlan = package_.category;
        user.membershipStatus = 'active';
        user.membershipStartDate = startDate;
        user.membershipEndDate = endDate;
        user.gracePeriodEndDate = gracePeriodEnd;
        user.lastPaymentDate = new Date();
        user.paymentHistory.push(payment._id as any);

        await user.save();

        // Update payment with membership dates
        payment.membershipStartDate = startDate;
        payment.membershipEndDate = endDate;
        await payment.save();

        // Increment package member count
        package_.currentMembers += 1;
        await package_.save();

        // Send membership activation email
        await sendMembershipActivationEmail(
          user.email,
          user.name,
          package_.name,
          package_.price,
          startDate,
          endDate
        );

        // Create notification
        await Notification.create({
          user: user._id,
          title: 'Payment Successful!',
          message: `Your payment of LKR ${payhere_amount} was successful. Your ${package_.name} membership is now active until ${endDate.toLocaleDateString()}.`,
          type: 'payment_success',
          priority: 'high',
          metadata: {
            amount: payhere_amount,
            orderId: order_id,
            packageName: package_.name,
            membershipEndDate: endDate,
            actionUrl: '/dashboard',
          },
        });
      }
    } else if (status_code === '0') {
      // Pending
      payment.statusMessage = status_message || 'Payment pending';
      await payment.save();
    } else if (status_code === '-1') {
      // Cancelled
      await payment.markAsCancelled();
    } else if (status_code === '-2') {
      // Failed
      await payment.markAsFailed(status_message || 'Payment failed', {
        status_code,
        payment_id,
      });

      // Create notification
      await Notification.create({
        user: userId,
        title: 'Payment Failed',
        message: `Your payment of LKR ${payhere_amount} failed. Please try again.`,
        type: 'payment_failed',
        priority: 'high',
        metadata: {
          amount: payhere_amount,
          orderId: order_id,
          reason: status_message,
          actionUrl: '/packages',
        },
      });
    } else if (status_code === '-3') {
      // Chargedback
      await payment.processRefund(parseFloat(payhere_amount), 'Chargeback');

      // Deactivate membership if exists
      const user = await User.findById(userId);
      if (user && user.membershipStatus === 'active') {
        user.membershipStatus = 'expired';
        await user.save();
      }
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('Payment notification error:', error);
    res.status(500).send('Error processing payment notification');
  }
};

// @desc    Get payment details by order ID
// @route   GET /api/payments/order/:orderId
// @access  Private
export const getPaymentByOrderId = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({ orderId })
      .populate('user', 'name email')
      .populate('package', 'name price durationMonths');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Check if user is authorized to view this payment
    if (
      payment.user._id.toString() !== (req as any).user._id.toString() &&
      (req as any).user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error: error.message,
    });
  }
};

// @desc    Get user's payment history
// @route   GET /api/payments/my-payments
// @access  Private
export const getMyPayments = async (req: Request, res: Response) => {
  try {
    const payments = await Payment.find({ user: (req as any).user._id })
      .populate('package', 'name price durationMonths')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history',
      error: error.message,
    });
  }
};

// @desc    Get all payments (Admin)
// @route   GET /api/payments
// @access  Admin only
export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const payments = await Payment.find(query)
      .populate('user', 'name email')
      .populate('package', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data: payments,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message,
    });
  }
};

// @desc    Get payment statistics (Admin)
// @route   GET /api/payments/stats
// @access  Admin only
export const getPaymentStats = async (req: Request, res: Response) => {
  try {
    const totalPayments = await Payment.countDocuments();
    const successfulPayments = await Payment.countDocuments({ status: 'success' });
    const failedPayments = await Payment.countDocuments({ status: 'failed' });
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });

    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'success',
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPayments,
        successfulPayments,
        failedPayments,
        pendingPayments,
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment statistics',
      error: error.message,
    });
  }
};
