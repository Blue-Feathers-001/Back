import { Request, Response } from 'express';
import { uploadToS3, deleteFromS3 } from '../services/s3Service';
import multer from 'multer';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Multer upload configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Upload single image
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    const folder = req.body.folder || 'uploads';
    const result = await uploadToS3(req.file, folder);

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        key: result.key,
        url: result.url,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file',
    });
  }
};

// Upload multiple images
export const uploadMultipleImages = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
      return;
    }

    const folder = req.body.folder || 'uploads';
    const uploadPromises = req.files.map((file) => uploadToS3(file, folder));
    const results = await Promise.all(uploadPromises);

    res.status(200).json({
      success: true,
      message: `${results.length} files uploaded successfully`,
      data: results,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload files',
    });
  }
};

// Delete image
export const deleteImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.body;

    if (!key) {
      res.status(400).json({
        success: false,
        message: 'File key is required',
      });
      return;
    }

    await deleteFromS3(key);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete file',
    });
  }
};
