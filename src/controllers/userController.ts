import { Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { uploadToS3, deleteFromS3 } from '../services/s3Service';

// Get all users (Admin only)
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      search,
      membershipStatus,
      membershipPlan,
      joinDateFrom,
      joinDateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit,
      page = '1'
    } = req.query;

    // Build filter object
    const filter: any = {};

    // Search across name, email, phone
    if (search && typeof search === 'string') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by membership status
    if (membershipStatus && typeof membershipStatus === 'string') {
      filter.membershipStatus = membershipStatus;
    }

    // Filter by membership plan
    if (membershipPlan && typeof membershipPlan === 'string') {
      filter.membershipPlan = membershipPlan;
    }

    // Filter by join date range
    if (joinDateFrom || joinDateTo) {
      filter.createdAt = {};
      if (joinDateFrom && typeof joinDateFrom === 'string') {
        filter.createdAt.$gte = new Date(joinDateFrom);
      }
      if (joinDateTo && typeof joinDateTo === 'string') {
        filter.createdAt.$lte = new Date(joinDateTo);
      }
    }

    // Build sort object
    const sort: any = {};
    if (typeof sortBy === 'string') {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = limit ? parseInt(limit as string) : undefined;
    const skip = limitNum ? (pageNum - 1) * limitNum : 0;

    // Execute query
    let query = User.find(filter).select('-password').sort(sort);

    if (limitNum) {
      query = query.skip(skip).limit(limitNum);
    }

    const users = await query;
    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: pageNum,
      pages: limitNum ? Math.ceil(total / limitNum) : 1,
      users,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Get single user
export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Create user (Admin only)
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, role, membershipStatus, membershipPlan, membershipStartDate, membershipEndDate } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role,
      membershipStatus,
      membershipPlan,
      membershipStartDate,
      membershipEndDate,
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        membershipStatus: user.membershipStatus,
        membershipPlan: user.membershipPlan,
        membershipStartDate: user.membershipStartDate,
        membershipEndDate: user.membershipEndDate,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Update user
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, membershipStatus, membershipPlan, membershipStartDate, membershipEndDate, role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if user is updating their own profile or admin updating any user
    if (req.user?.role !== 'admin' && user._id.toString() !== req.user?._id.toString()) {
      res.status(403).json({ message: 'Not authorized to update this user' });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        name: name || user.name,
        email: email || user.email,
        phone: phone || user.phone,
        membershipStatus: membershipStatus || user.membershipStatus,
        membershipPlan: membershipPlan || user.membershipPlan,
        membershipStartDate: membershipStartDate || user.membershipStartDate,
        membershipEndDate: membershipEndDate || user.membershipEndDate,
        role: req.user?.role === 'admin' ? role || user.role : user.role,
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Delete user (Admin only)
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Bulk update users (Admin only)
export const bulkUpdateUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userIds, updates } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ message: 'User IDs array is required' });
      return;
    }

    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ message: 'Updates object is required' });
      return;
    }

    // Update multiple users
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: updates }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} users updated successfully`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Bulk delete users (Admin only)
export const bulkDeleteUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ message: 'User IDs array is required' });
      return;
    }

    // Delete multiple users
    const result = await User.deleteMany({ _id: { $in: userIds } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} users deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Update profile picture
export const updateProfilePicture = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
      return;
    }

    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Delete old profile picture from S3 if exists
    if (user.avatar) {
      try {
        // Extract key from URL (format: https://bucket.s3.region.amazonaws.com/key)
        const urlParts = user.avatar.split('.amazonaws.com/');
        if (urlParts.length > 1) {
          const oldKey = urlParts[1];
          await deleteFromS3(oldKey);
        }
      } catch (error) {
        console.error('Error deleting old profile picture:', error);
        // Continue even if deletion fails
      }
    }

    // Upload new profile picture
    const result = await uploadToS3(req.file, 'profile-pictures');

    // Update user avatar
    user.avatar = result.url;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      avatar: result.url,
    });
  } catch (error: any) {
    console.error('Update profile picture error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile picture',
    });
  }
};
