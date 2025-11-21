import { Response } from 'express';
import User from '../models/User';
import Entry from '../models/Entry';
import { AuthRequest } from '../middleware/auth';

// Get all active members (Trainer access)
export const getActiveMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      search,
      membershipPlan,
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    // Build filter object - only active members
    const filter: any = {
      role: 'user',
      membershipStatus: { $in: ['active', 'grace_period'] },
    };

    // Search across name, email, phone
    if (search && typeof search === 'string') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by membership plan
    if (membershipPlan && typeof membershipPlan === 'string') {
      filter.membershipPlan = membershipPlan;
    }

    // Build sort object
    const sort: any = {};
    if (typeof sortBy === 'string') {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Execute query - exclude sensitive fields, use lean() for performance
    const members = await User.find(filter)
      .select('name email phone membershipStatus membershipPlan membershipEndDate profileImage avatar')
      .sort(sort)
      .lean();

    res.status(200).json({
      success: true,
      count: members.length,
      members,
    });
  } catch (error) {
    console.error('Get active members error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get attendance statistics (Trainer access)
export const getAttendanceStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = '7' } = req.query;
    const days = parseInt(period as string) || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // OPTIMIZED: Run all queries in parallel
    const [totalEntries, allowedEntries, deniedEntries, uniqueUsers, dailyStats] = await Promise.all([
      Entry.countDocuments({ timestamp: { $gte: startDate } }),
      Entry.countDocuments({ timestamp: { $gte: startDate }, status: 'allowed' }),
      Entry.countDocuments({ timestamp: { $gte: startDate }, status: 'denied' }),
      Entry.distinct('user', { timestamp: { $gte: startDate }, status: 'allowed' }),
      Entry.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, status: '$status' }, count: { $sum: 1 } } },
        { $sort: { '_id.date': 1 } },
      ])
    ]);

    // Get peak hours (last 7 days)
    const hourlyStats = await Entry.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          status: 'allowed',
        },
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    // Get recent entries with user details
    const recentEntries = await Entry.find({
      timestamp: { $gte: startDate },
    })
      .populate('user', 'name email membershipStatus membershipPlan')
      .sort({ timestamp: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      period: days,
      stats: {
        totalEntries,
        allowedEntries,
        deniedEntries,
        uniqueUsers: uniqueUsers.length,
        dailyStats,
        hourlyStats,
        recentEntries,
      },
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get currently checked-in users (Trainer access)
export const getCurrentlyCheckedIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get entries from today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayEntries = await Entry.find({
      timestamp: { $gte: startOfDay },
      status: 'allowed',
    })
      .populate('user', 'name email membershipStatus membershipPlan profileImage avatar')
      .sort({ timestamp: -1 });

    // Get unique users (latest entry per user)
    const uniqueUsers = new Map();
    todayEntries.forEach((entry) => {
      const userId = entry.user._id.toString();
      if (!uniqueUsers.has(userId)) {
        uniqueUsers.set(userId, entry);
      }
    });

    const checkedInUsers = Array.from(uniqueUsers.values());

    res.status(200).json({
      success: true,
      count: checkedInUsers.length,
      users: checkedInUsers,
    });
  } catch (error) {
    console.error('Get currently checked-in error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get all trainers (Admin only)
export const getTrainers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, isActive } = req.query;

    const filter: any = { role: 'trainer' };

    if (search && typeof search === 'string') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const trainers = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: trainers.length,
      trainers,
    });
  } catch (error) {
    console.error('Get trainers error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Create trainer (Admin only)
export const createTrainer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      res.status(400).json({
        message: 'Please provide name, email, and password'
      });
      return;
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }

    // Create trainer
    const trainer = await User.create({
      name,
      email,
      password,
      phone,
      role: 'trainer',
      isActive: true,
      membershipStatus: 'active', // Trainers are always active
    });

    res.status(201).json({
      success: true,
      trainer: {
        id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        role: trainer.role,
        isActive: trainer.isActive,
      },
    });
  } catch (error) {
    console.error('Create trainer error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Toggle trainer active status (Admin only)
export const toggleTrainerStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const trainer = await User.findOne({ _id: id, role: 'trainer' });

    if (!trainer) {
      res.status(404).json({ message: 'Trainer not found' });
      return;
    }

    trainer.isActive = isActive;
    await trainer.save();

    res.status(200).json({
      success: true,
      message: `Trainer ${isActive ? 'activated' : 'deactivated'} successfully`,
      trainer: {
        id: trainer._id,
        name: trainer.name,
        isActive: trainer.isActive,
      },
    });
  } catch (error) {
    console.error('Toggle trainer status error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};
