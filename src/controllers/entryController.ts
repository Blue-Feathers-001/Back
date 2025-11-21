import { Request, Response } from 'express';
import Entry from '../models/Entry';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

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

    // Trainers are always allowed - no membership check needed
    let entryStatus: 'allowed' | 'denied';
    let reason: string;

    if (user.role === 'trainer') {
      entryStatus = 'allowed';
      reason = 'Trainer access';
    } else {
      // Check if user's membership is active
      const isActive = user.membershipStatus === 'active';
      const hasExpired = user.membershipEndDate && new Date(user.membershipEndDate) < new Date();

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

    // Check for suspicious activity (5 denied attempts in same day)
    if (entryStatus === 'denied') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const deniedToday = await Entry.countDocuments({
        user: userId,
        status: 'denied',
        timestamp: { $gte: startOfDay },
      });

      // If this will be the 5th denial today, flag user as suspicious
      if (deniedToday + 1 >= 5 && !user.isFlagged) {
        user.isFlagged = true;
        user.flaggedAt = new Date();
        user.flagReason = `${deniedToday + 1} denied entries in one day`;
        await user.save();

        console.log(`[Security Alert] User ${user.name} (${user._id}) flagged for ${deniedToday + 1} denied entries today`);
      }
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
      .populate('user', 'name email membershipPlan membershipStatus avatar role')
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

// Get user's own check-in history (authenticated users - only allowed entries)
export const getUserCheckInHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Only show allowed entries to regular users
    const entries = await Entry.find({
      user: userId,
      status: 'allowed', // Filter out denied entries
    })
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Entry.countDocuments({
      user: userId,
      status: 'allowed',
    });

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
    console.error('[Entry] Get user history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch check-in history',
      error: error.message,
    });
  }
};

// Get users currently in gym (admin/trainer)
export const getCurrentlyInGym = async (req: AuthRequest, res: Response) => {
  try {
    // Get entries from today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // OPTIMIZED: Use aggregation with $group to get unique users directly in DB
    const currentlyInGym = await Entry.aggregate([
      { $match: { timestamp: { $gte: startOfDay }, status: 'allowed' } },
      { $sort: { timestamp: -1 } },
      { $group: {
          _id: '$user',
          entry: { $first: '$$ROOT' }
        }
      },
      { $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
          pipeline: [{ $project: { name: 1, email: 1, membershipStatus: 1, membershipPlan: 1, profileImage: 1, avatar: 1, role: 1 } }]
        }
      },
      { $unwind: '$userDetails' },
      { $replaceRoot: { newRoot: { $mergeObjects: ['$entry', { user: '$userDetails' }] } } },
      { $sort: { timestamp: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      count: currentlyInGym.length,
      entries: currentlyInGym,
    });
  } catch (error: any) {
    console.error('[Entry] Get currently in gym error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch currently in gym',
      error: error.message,
    });
  }
};

// Get flagged users (admin/trainer)
export const getFlaggedUsers = async (req: AuthRequest, res: Response) => {
  try {
    const flaggedUsers = await User.find({
      isFlagged: true,
    }).select('name email membershipStatus membershipPlan profileImage avatar isFlagged flaggedAt flagReason role');

    return res.status(200).json({
      success: true,
      count: flaggedUsers.length,
      users: flaggedUsers,
    });
  } catch (error: any) {
    console.error('[Entry] Get flagged users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch flagged users',
      error: error.message,
    });
  }
};

// Clear user flag (admin only)
export const clearUserFlag = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isFlagged = false;
    user.flaggedAt = undefined;
    user.flagReason = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User flag cleared successfully',
    });
  } catch (error: any) {
    console.error('[Entry] Clear flag error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear user flag',
      error: error.message,
    });
  }
};
