import express from 'express';
import { upload, chatUpload, uploadImage, uploadMultipleImages, uploadChatFile, deleteImage } from '../controllers/uploadController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Upload single image (authenticated users only)
router.post('/single', protect, upload.single('image'), uploadImage);

// Upload multiple images (authenticated users only)
router.post('/multiple', protect, upload.array('images', 10), uploadMultipleImages);

// Upload chat file (any file type, authenticated users only)
router.post('/chat', protect, chatUpload.single('file'), uploadChatFile);

// Delete image (admin only)
router.delete('/', protect, authorize('admin'), deleteImage);

export default router;
