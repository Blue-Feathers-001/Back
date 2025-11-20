import { Request, Response } from 'express';
import Entry from '../models/Entry';
import User from '../models/User';

// Scan QR code and validate entry
export const scanEntry = async (req: Request, res: Response) => {
  try {
    const { userId, membershipId, status, expiry } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code data',
      });
    }

    // Find user in database
    const user = await User.findById(userId);

    if (!user) {
      // Log denied entry
      await Entry.create({
        user: userId,
        status: 'denied',
        reason: 'User not found',
        membershipStatus: 'unknown',
      });

      return res.status(404).json({
        success: false,
        message: 'User not found',
        entry: 'denied',
      });
    }

    // Check if user's membership is active
    const isActive = user.membershipStatus === 'active';
    const hasExpired = user.membershipEndDate && new Date(user.membershipEndDate) < new Date();

    let entryStatus: 'allowed' | 'denied';
    let reason: string;

    if (!isActive) {
      entryStatus = 'denied';
      reason = 'Membership inactive';
    } else if (hasExpired) {
      entryStatus = 'denied';
      reason = 'Membership expired';
    } else {
      entryStatus = 'allowed';
      reason = 'Valid membership';
    }

    // Check for duplicate entry within last 5 minutes (prevent card sharing)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEntry = await Entry.findOne({
      user: userId,
      timestamp: { $gte: fiveMinutesAgo },
      status: 'allowed',
    });

    if (recentEntry) {
      entryStatus = 'denied';
      reason = 'Already checked in recently';
    }

    // Log entry
    const entry = await Entry.create({
      user: userId,
      status: entryStatus,
      reason,
      membershipStatus: user.membershipStatus,
    });

    // Populate user data for response
    await entry.populate('user', 'name email membershipPlan membershipExpiry avatar');

    return res.status(200).json({
      success: true,
      entry: entryStatus,
      reason,
      user: {
        name: user.name,
        membershipPlan: user.membershipPlan,
        membershipStatus: user.membershipStatus,
        membershipExpiry: user.membershipEndDate,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    console.error('[Entry] Scan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process entry scan',
      error: error.message,
    });
  }
};

// Get all entry logs (admin only)
export const getEntryLogs = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status, userId, startDate, endDate } = req.query;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (userId) {
      query.user = userId;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate as string);
      }
    }

    const entries = await Entry.find(query)
      .populate('user', 'name email membershipPlan membershipStatus avatar')
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Entry.countDocuments(query);

    return res.status(200).json({
      success: true,
      entries,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('[Entry] Get logs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch entry logs',
      error: error.message,
    });
  }
};

// Get entry stats (admin only)
export const getEntryStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEntries = await Entry.countDocuments({
      timestamp: { $gte: today },
      status: 'allowed',
    });

    const todayDenied = await Entry.countDocuments({
      timestamp: { $gte: today },
      status: 'denied',
    });

    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const weeklyEntries = await Entry.countDocuments({
      timestamp: { $gte: thisWeek },
      status: 'allowed',
    });

    const thisMonth = new Date(today);
    thisMonth.setDate(1);

    const monthlyEntries = await Entry.countDocuments({
      timestamp: { $gte: thisMonth },
      status: 'allowed',
    });

    return res.status(200).json({
      success: true,
      stats: {
        today: todayEntries,
        todayDenied,
        thisWeek: weeklyEntries,
        thisMonth: monthlyEntries,
      },
    });
  } catch (error: any) {
    console.error('[Entry] Get stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch entry stats',
      error: error.message,
    });
  }
};
