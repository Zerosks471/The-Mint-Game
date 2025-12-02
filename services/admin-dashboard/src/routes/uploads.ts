import { Router, Response } from 'express';
import { AdminRequest } from '../middleware';
import { logger } from '../services/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const router: ReturnType<typeof Router> = Router();

// Upload directory - stored in api-gateway's public folder for serving
const UPLOADS_DIR = path.resolve(__dirname, '../../../api-gateway/uploads/cosmetics');

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();
    cb(null, `${timestamp}-${uniqueId}${ext}`);
  },
});

// File filter - only allow images
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG images are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1,
  },
});

/**
 * POST /admin/uploads/cosmetic
 * Upload a cosmetic image
 */
router.post('/cosmetic', upload.single('image'), async (req: AdminRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No image file provided' },
      });
    }

    const filename = req.file.filename;
    const url = `/uploads/cosmetics/${filename}`;

    logger.info('Cosmetic image uploaded', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    res.json({
      success: true,
      data: {
        filename,
        url,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    logger.error('Error uploading cosmetic image', { error });
    res.status(500).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: 'Failed to upload image' },
    });
  }
});

/**
 * DELETE /admin/uploads/cosmetic/:filename
 * Delete a cosmetic image
 */
router.delete('/cosmetic/:filename', async (req: AdminRequest, res: Response) => {
  try {
    const { filename } = req.params;

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(UPLOADS_DIR, sanitizedFilename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Image not found' },
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    logger.info('Cosmetic image deleted', {
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      filename: sanitizedFilename,
    });

    res.json({
      success: true,
      data: { deleted: true, filename: sanitizedFilename },
    });
  } catch (error) {
    logger.error('Error deleting cosmetic image', { error });
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: 'Failed to delete image' },
    });
  }
});

/**
 * GET /admin/uploads/cosmetics
 * List all uploaded cosmetic images
 */
router.get('/cosmetics', async (req: AdminRequest, res: Response) => {
  try {
    const files = fs.readdirSync(UPLOADS_DIR);

    const images = files
      .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
      .map(filename => {
        const filePath = path.join(UPLOADS_DIR, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          url: `/uploads/cosmetics/${filename}`,
          size: stats.size,
          createdAt: stats.birthtime,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: images,
    });
  } catch (error) {
    logger.error('Error listing cosmetic images', { error });
    res.status(500).json({
      success: false,
      error: { code: 'LIST_ERROR', message: 'Failed to list images' },
    });
  }
});

// Error handler for multer errors
router.use((err: Error, req: AdminRequest, res: Response, next: Function) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 5MB limit' },
      });
    }
    return res.status(400).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: err.message },
    });
  }
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_TYPE', message: err.message },
    });
  }
  next(err);
});

export default router;
