import { Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

// Get all users (Admin only)
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
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
