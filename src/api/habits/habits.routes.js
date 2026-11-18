import express from 'express';
import { getHabits, saveHabits } from './habits.controller.js';
import { optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, getHabits);
router.post('/', optionalAuth, saveHabits);

export default router;
