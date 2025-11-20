import express from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  bulkUpdateUsers,
  bulkDeleteUsers,
  updateProfilePicture,
  generateUserMembershipCard,
  generateUserMembershipCardPNG,
} from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';
import { upload } from '../controllers/uploadController';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Update profile picture (authenticated users)
router.put('/profile/picture', upload.single('avatar'), updateProfilePicture);

// Get all users and create user (admin only)
router
  .route('/')
  .get(authorize('admin'), getUsers)
  .post(authorize('admin'), createUser);

// Bulk operations (admin only)
router.post('/bulk/update', authorize('admin'), bulkUpdateUsers);
router.post('/bulk/delete', authorize('admin'), bulkDeleteUsers);

// Generate membership card (admin only)
router.get('/:id/membership-card', authorize('admin'), generateUserMembershipCard);
router.get('/:id/membership-card-png', authorize('admin'), generateUserMembershipCardPNG);

// Get, update, delete single user
router
  .route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(authorize('admin'), deleteUser);

export default router;
