import { Request, Response } from 'express';
import Feedback from '../models/Feedback';
import { AuthRequest } from '../middleware/auth';
import { sendEmail } from '../utils/emailService';

// Submit feedback (public or authenticated)
export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const { name, email, category, message, isAnonymous } = req.body;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    if (!name || !email || !category || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Create feedback
    const feedback = await Feedback.create({
      user: userId || undefined,
      name,
      email,
      category,
      message,
      isAnonymous: isAnonymous || false,
    });

    // Send email notification to admin (async, non-blocking)
    sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@bluefeathers.com',
      subject: `New Feedback: ${category}`,
      html: `
        <h2>New Feedback Received</h2>
        <p><strong>From:</strong> ${isAnonymous ? 'Anonymous' : name}</p>
        <p><strong>Email:</strong> ${isAnonymous ? 'Hidden' : email}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      `,
    }).catch(emailError => {
      console.error('[Feedback] Failed to send email notification:', emailError);
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! We will review it shortly.',
      feedback,
    });
  } catch (error: any) {
    console.error('[Feedback] Submit error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message,
    });
  }
};

// Get all feedback (admin only)
export const getAllFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const feedback = await Feedback.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Feedback.countDocuments(filter);

    const stats = {
      total: await Feedback.countDocuments(),
      new: await Feedback.countDocuments({ status: 'New' }),
      underReview: await Feedback.countDocuments({ status: 'Under Review' }),
      resolved: await Feedback.countDocuments({ status: 'Resolved' }),
    };

    return res.status(200).json({
      success: true,
      feedback,
      stats,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('[Feedback] Get all error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: error.message,
    });
  }
};

// Update feedback status (admin only)
export const updateFeedbackStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { feedbackId } = req.params;
    const { status } = req.body;

    if (!['New', 'Under Review', 'Resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      { status },
      { new: true }
    ).populate('user', 'name email role');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback status updated successfully',
      feedback,
    });
  } catch (error: any) {
    console.error('[Feedback] Update status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update feedback status',
      error: error.message,
    });
  }
};

// Add admin response (admin only)
export const addAdminResponse = async (req: AuthRequest, res: Response) => {
  try {
    const { feedbackId } = req.params;
    const { adminResponse } = req.body;

    if (!adminResponse) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a response',
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      { adminResponse },
      { new: true }
    ).populate('user', 'name email role');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found',
      });
    }

    // Send email to user if they're not anonymous and have an email (async, non-blocking)
    if (!feedback.isAnonymous && feedback.email) {
      sendEmail({
        to: feedback.email,
        subject: `Response to Your Feedback: ${feedback.category}`,
        html: `
          <h2>Response to Your Feedback</h2>
          <p>Hi ${feedback.name},</p>
          <p>Thank you for your feedback. Here's our response:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your Message:</strong></p>
            <p>${feedback.message}</p>
          </div>
          <div style="background-color: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Our Response:</strong></p>
            <p>${adminResponse}</p>
          </div>
          <p>If you have any further questions, please don't hesitate to reach out.</p>
          <p>Best regards,<br>Blue Feathers Gym Team</p>
        `,
      }).catch(emailError => {
        console.error('[Feedback] Failed to send response email:', emailError);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Response added successfully',
      feedback,
    });
  } catch (error: any) {
    console.error('[Feedback] Add response error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add response',
      error: error.message,
    });
  }
};

// Delete feedback (admin only)
export const deleteFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Feedback.findByIdAndDelete(feedbackId);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully',
    });
  } catch (error: any) {
    console.error('[Feedback] Delete error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete feedback',
      error: error.message,
    });
  }
};
