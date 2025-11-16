import { Response } from 'express';
import User from '../models/User';
import Payment from '../models/Payment';
import { AuthRequest } from '../middleware/auth';

// Global search across users and payments
export const globalSearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }

    const searchRegex = { $regex: q, $options: 'i' };

    // Search users
    const users = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ],
    })
      .select('-password')
      .limit(10);

    // Search payments by order ID, status, or payment method
    const payments = await Payment.find({
      $or: [
        { orderId: searchRegex },
        { payHerePaymentId: searchRegex },
        { status: searchRegex },
        { paymentMethod: searchRegex },
      ],
    })
      .populate('user', 'name email')
      .populate('package', 'name price')
      .limit(10);

    res.status(200).json({
      success: true,
      results: {
        users: {
          count: users.length,
          data: users,
        },
        payments: {
          count: payments.length,
          data: payments,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
