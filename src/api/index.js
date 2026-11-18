import express from 'express';
import authRoutes from './auth/auth.routes.js';
import categoriesRoutes from './categories/categories.routes.js';
import userRoutes from './users/users.routes.js';
import groupRoutes from './groups/groups.routes.js';
import habitRoutes from './habits/habits.routes.js';
import logRoutes from './logs/logs.routes.js';
import feedRoutes from './feed/feed.routes.js';
import challengeRoutes from './challenges/challenges.routes.js';
import uploadRoutes from './upload/upload.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/categories', categoriesRoutes);
router.use('/users', userRoutes);
router.use('/groups', groupRoutes);
router.use('/habits', habitRoutes);
router.use('/logs', logRoutes);
router.use('/feed', feedRoutes);
router.use('/challenges', challengeRoutes);
router.use('/upload', uploadRoutes);

export default router;
