import multer from 'multer';
import AppError from '../utils/AppError.js';
import { BAD_REQUEST } from '../constants/httpStatus.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(new AppError('Only JPEG, PNG, and WEBP product images are allowed.', BAD_REQUEST, 'INVALID_PRODUCT_IMAGE'));
    }
    return callback(null, true);
  },
});

export const productImageUpload = (req, res, next) => {
  upload.array('images', 8)(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Each product image must be 5 MB or smaller.'
        : 'A product can have at most 8 images.';
      return next(new AppError(message, BAD_REQUEST, 'INVALID_PRODUCT_IMAGE'));
    }
    return next(error);
  });
};