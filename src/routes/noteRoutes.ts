import express from 'express';
import { getUserNotes, createNote, deleteNote } from '../controllers/noteController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication and admin access
router.use(protect, authorize('admin'));

router.get('/user/:userId', getUserNotes);
router.post('/user/:userId', createNote);
router.delete('/:id', deleteNote);

export default router;
