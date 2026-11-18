import express from 'express';
import { getFeed } from './feed.controller.js';
import { auth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getFeed);

export default router;
