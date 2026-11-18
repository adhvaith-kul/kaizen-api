import express from 'express';
import {
  createGroup,
  getGroupByCode,
  joinGroupByCode,
  getUserGroups,
  updateGroup,
  deleteGroup,
  getLeaderboard,
} from './groups.controller.js';
import { optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

router.post('/', optionalAuth, createGroup);
router.post('/join', optionalAuth, joinGroupByCode);
router.get('/code/:code', optionalAuth, getGroupByCode);
router.get('/user/:userId', optionalAuth, getUserGroups);
router.patch('/:id', optionalAuth, updateGroup);
router.delete('/:id', optionalAuth, deleteGroup);
router.get('/:id/leaderboard', optionalAuth, getLeaderboard);

export default router;
