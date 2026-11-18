import express from 'express';
import {
  getUser,
  updateUserAvatar,
  getProfileStats,
  getUserLogs,
  getUserFeed,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowing,
  getFollowers,
  searchUsers,
} from './users.controller.js';
import { auth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/search', auth, searchUsers);
router.get('/:id', auth, getUser);
router.patch('/:id/avatar', auth, updateUserAvatar);
router.get('/:id/stats', auth, getProfileStats);
router.get('/:id/logs', auth, getUserLogs);
router.get('/:id/feed', auth, getUserFeed);

router.post('/:id/follow/:targetId', auth, followUser);
router.delete('/:id/follow/:targetId', auth, unfollowUser);
router.get('/:id/is-following/:targetId', auth, isFollowing);
router.get('/:id/following', auth, getFollowing);
router.get('/:id/followers', auth, getFollowers);

export default router;
