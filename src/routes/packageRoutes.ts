import express from 'express';
import {
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  togglePackageActive,
  getPackageStats,
} from '../controllers/packageController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getAllPackages);
router.get('/:id', getPackageById);

// Admin only routes
router.post('/', protect, authorize('admin'), createPackage);
router.put('/:id', protect, authorize('admin'), updatePackage);
router.delete('/:id', protect, authorize('admin'), deletePackage);
router.patch('/:id/toggle-active', protect, authorize('admin'), togglePackageActive);
router.get('/:id/stats', protect, authorize('admin'), getPackageStats);

export default router;
