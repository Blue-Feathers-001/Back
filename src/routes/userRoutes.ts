import express from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  bulkUpdateUsers,
  bulkDeleteUsers,
} from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all users and create user (admin only)
router
  .route('/')
  .get(authorize('admin'), getUsers)
  .post(authorize('admin'), createUser);

// Bulk operations (admin only)
router.post('/bulk/update', authorize('admin'), bulkUpdateUsers);
router.post('/bulk/delete', authorize('admin'), bulkDeleteUsers);

// Get, update, delete single user
router
  .route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(authorize('admin'), deleteUser);

export default router;
