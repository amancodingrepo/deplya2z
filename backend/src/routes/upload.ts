import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { imageService } from '../services/ImageService.js';

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG and WebP images are allowed'));
    }
  },
});

const deleteSchema = z.object({
  url: z.string().url(),
});

export const uploadRouter = Router();

uploadRouter.use(authRequired, rolesAllowed(['superadmin', 'warehouse_manager']));

uploadRouter.post(
  '/product-image',
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          code: 'NO_FILE',
          message: 'No image file provided',
        });
      }

      const result = await imageService.processAndUpload(req.file.buffer, req.file.originalname);

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  },
);

uploadRouter.delete('/product-image', async (req, res, next) => {
  try {
    const parsed = deleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        code: 'INVALID_PAYLOAD',
        message: 'url is required',
        details: parsed.error.flatten(),
      });
    }

    await imageService.deleteImage(parsed.data.url);

    return res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    return next(error);
  }
});
