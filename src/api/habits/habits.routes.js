import express from 'express';
import { getHabits, saveHabits } from './habits.controller.js';
import { auth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getHabits);
router.post('/', auth, saveHabits);

export default router;
