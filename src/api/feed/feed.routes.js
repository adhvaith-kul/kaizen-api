import express from 'express';
import { getFeed } from './feed.controller.js';
import { optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, getFeed);

export default router;
