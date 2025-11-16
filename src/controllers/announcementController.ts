import { Response } from 'express';
import Announcement from '../models/Announcement';
import { AuthRequest } from '../middleware/auth';

// Get all announcements
export const getAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activeOnly } = req.query;

    const filter: any = {};

    if (activeOnly === 'true') {
      filter.isActive = true;
      filter.$or = [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ];
    }

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: announcements.length,
      announcements,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Create announcement
export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, content, type, expiresAt } = req.body;

    if (!title || !content) {
      res.status(400).json({ message: 'Title and content are required' });
      return;
    }

    const announcement = await Announcement.create({
      title,
      content,
      type,
      expiresAt,
      createdBy: req.user?._id,
    });

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      announcement: populatedAnnouncement,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Update announcement
export const updateAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, type, isActive, expiresAt } = req.body;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { title, content, type, isActive, expiresAt },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!announcement) {
      res.status(404).json({ message: 'Announcement not found' });
      return;
    }

    res.status(200).json({
      success: true,
      announcement,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Delete announcement
export const deleteAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      res.status(404).json({ message: 'Announcement not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
