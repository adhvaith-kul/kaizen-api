import express from 'express';
import multer from 'multer';
import { uploadProfileImage, uploadHabitImage } from './upload.controller.js';
import { optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
});

router.post('/profile', optionalAuth, upload.single('image'), uploadProfileImage);
router.post('/habit', optionalAuth, upload.single('image'), uploadHabitImage);
router.post('/', optionalAuth, upload.single('image'), uploadHabitImage);

export default router;
