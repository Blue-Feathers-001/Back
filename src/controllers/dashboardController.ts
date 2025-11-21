import { Request, Response } from 'express';
import User from '../models/User';
import Payment from '../models/Payment';
import MembershipPackage from '../models/MembershipPackage';
import { cache, CacheKeys, CacheTTL } from '../utils/cache';

// Get dashboard statistics
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // OPTIMIZED: Check cache first
    const cacheKey = CacheKeys.dashboardStats();
    const cachedStats = cache.get(cacheKey);

    if (cachedStats) {
      return res.status(200).json({
        success: true,
        data: cachedStats,
        cached: true,
      });
    }

    // OPTIMIZED: Run all count queries in parallel
    const [totalUsers, activeMembers, revenueData, totalPackages] = await Promise.all([
      // Total users count (excluding admins and trainers)
      User.countDocuments({ role: 'user' }),
      // Active members count (active or in grace period)
      User.countDocuments({
        role: 'user',
        membershipStatus: { $in: ['active', 'grace_period'] }
      }),
      // Total revenue from successful payments
      Payment.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Total packages count
      MembershipPackage.countDocuments()
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    const stats = {
      totalUsers,
      activeMembers,
      totalRevenue,
      totalPackages,
    };

    // Cache the results
    cache.set(cacheKey, stats, CacheTTL.DASHBOARD);

    return res.status(200).json({
      success: true,
      data: stats,
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
