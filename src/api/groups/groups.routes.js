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
import { auth } from '../../middleware/auth.js';

const router = express.Router();

router.post('/', auth, createGroup);
router.post('/join', auth, joinGroupByCode);
router.get('/code/:code', auth, getGroupByCode);
router.get('/user/:userId', auth, getUserGroups);
router.patch('/:id', auth, updateGroup);
router.delete('/:id', auth, deleteGroup);
router.get('/:id/leaderboard', auth, getLeaderboard);

export default router;
