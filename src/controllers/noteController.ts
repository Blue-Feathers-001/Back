import { Response } from 'express';
import Note from '../models/Note';
import { AuthRequest } from '../middleware/auth';

// Get notes for a user
export const getUserNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const notes = await Note.find({ user: userId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Create note
export const createNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ message: 'Note content is required' });
      return;
    }

    const note = await Note.create({
      user: userId,
      createdBy: req.user?._id,
      content,
    });

    const populatedNote = await Note.findById(note._id).populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      note: populatedNote,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Delete note
export const deleteNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const note = await Note.findById(id);

    if (!note) {
      res.status(404).json({ message: 'Note not found' });
      return;
    }

    await Note.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
