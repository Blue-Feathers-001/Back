import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../utils/emailService';

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as any, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  } as any) as string;
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

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
    });

    const token = generateToken((user._id as any).toString());

    // Send welcome email (async, don't wait for it)
    sendWelcomeEmail(user.email, user.name).catch((err) =>
      console.error('Failed to send welcome email:', err)
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        membershipStatus: user.membershipStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Please provide email and password' });
      return;
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const token = generateToken((user._id as any).toString());

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        membershipStatus: user.membershipStatus,
        membershipPlan: user.membershipPlan,
        membershipEndDate: user.membershipEndDate,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const oauthRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, provider, providerId, avatar } = req.body;

    console.log('=== OAUTH REGISTRATION REQUEST ===');
    console.log('Provider:', provider);
    console.log('Email:', email);

    // Check if user already exists by email
    let user = await User.findOne({ email });

    if (user) {
      // User exists - update OAuth info if needed
      console.log('Existing user found:', user.email);

      // Update provider info if it was previously a local account
      if (!user.googleId && provider === 'google') {
        user.googleId = providerId;
        user.authProvider = 'google';
        user.avatar = avatar || user.avatar;
        await user.save();
        console.log('Updated existing local account to OAuth account');
      }
    } else {
      // Create new OAuth user
      console.log('Creating new OAuth user');

      user = await User.create({
        name,
        email,
        googleId: providerId,
        authProvider: provider,
        avatar,
        membershipStatus: 'inactive',
        role: 'user',
      });

      console.log('New OAuth user created:', user.email);
    }

    // Generate JWT token
    const token = generateToken((user._id as any).toString());

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        membershipStatus: user.membershipStatus,
        membershipPlan: user.membershipPlan,
        membershipEndDate: user.membershipEndDate,
        avatar: user.avatar,
        authProvider: user.authProvider,
      },
    });
  } catch (error) {
    console.error('OAuth registration error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Forgot password - send OTP
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: 'No user found with that email' });
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP and set to resetPasswordToken field
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    user.resetPasswordToken = hashedOTP;
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await user.save();

    // Send email with OTP
    await sendPasswordResetEmail(user.email, user.name, otp);

    res.status(200).json({
      success: true,
      message: 'Password reset OTP sent to your email',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Email could not be sent', error });
  }
};

// Reset password using OTP
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      res.status(400).json({ message: 'Please provide email, OTP and new password' });
      return;
    }

    // Hash the OTP
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    // Find user by email, OTP and check if not expired
    const user = await User.findOne({
      email,
      resetPasswordToken: hashedOTP,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired OTP' });
      return;
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate new JWT token
    const jwtToken = generateToken((user._id as any).toString());

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token: jwtToken,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Update user profile
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, notificationPreferences } = req.body;

    const user = await User.findById(req.user?._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        res.status(400).json({ message: 'Email already in use' });
        return;
      }
      user.email = email;
    }

    // Update fields
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone; // Allow empty string to clear phone
    if (notificationPreferences) {
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...notificationPreferences,
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// Change password (when user is logged in)
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Please provide current and new password' });
      return;
    }

    const user = await User.findById(req.user?._id).select('+password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if user has a password (OAuth users might not have one)
    if (!user.password) {
      res.status(400).json({ message: 'Cannot change password for OAuth accounts' });
      return;
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      res.status(401).json({ message: 'Current password is incorrect' });
      return;
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};
