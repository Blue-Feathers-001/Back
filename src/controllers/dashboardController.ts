import { Request, Response } from 'express';
import User from '../models/User';
import Payment from '../models/Payment';
import MembershipPackage from '../models/MembershipPackage';

// Get dashboard statistics
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Total users count (excluding admins and trainers)
    const totalUsers = await User.countDocuments({
      role: { $in: ['user'] }
    });

    // Active members count (active or in grace period)
    const activeMembers = await User.countDocuments({
      role: 'user',
      membershipStatus: { $in: ['active', 'grace_period'] }
    });

    // Total revenue from successful payments
    const revenueData = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    // Total packages count
    const totalPackages = await MembershipPackage.countDocuments();

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeMembers,
        totalRevenue,
        totalPackages,
      },
    });
  } catch (error) {
    console.error('[Dashboard] Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
