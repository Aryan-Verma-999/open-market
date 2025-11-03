import multer from 'multer';
import { Request } from 'express';

// Configure multer for memory storage (we'll upload to S3)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow images and PDFs
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`));
  }
};

// Create multer instance for listing uploads
export const listingUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 20 // Max 20 files per request (12 images + 8 documents)
  }
});

// Middleware for handling listing file uploads
export const uploadListingFiles = listingUpload.fields([
  { name: 'images', maxCount: 12 },
  { name: 'documents', maxCount: 8 }
]);

// Middleware for handling single image upload
export const uploadSingleImage = listingUpload.single('image');

// Middleware for handling multiple images
export const uploadMultipleImages = listingUpload.array('images', 12);

// Error handling middleware for multer
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds the 50MB limit'
          }
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Too many files uploaded'
          }
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: {
            code: 'UNEXPECTED_FIELD',
            message: 'Unexpected file field'
          }
        });
      default:
        return res.status(400).json({
          error: {
            code: 'UPLOAD_ERROR',
            message: error.message
          }
        });
    }
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: {
        code: 'INVALID_FILE_TYPE',
        message: error.message
      }
    });
  }

  next(error);
};