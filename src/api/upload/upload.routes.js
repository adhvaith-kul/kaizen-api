import express from 'express';
import multer from 'multer';
import { uploadProfileImage, uploadHabitImage } from './upload.controller.js';
import { auth } from '../../middleware/auth.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
});

router.post('/profile', auth, upload.single('image'), uploadProfileImage);
router.post('/habit', auth, upload.single('image'), uploadHabitImage);
router.post('/', auth, upload.single('image'), uploadHabitImage);

export default router;
