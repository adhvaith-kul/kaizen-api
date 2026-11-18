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
import { optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/search', optionalAuth, searchUsers);
router.get('/:id', optionalAuth, getUser);
router.patch('/:id/avatar', optionalAuth, updateUserAvatar);
router.get('/:id/stats', optionalAuth, getProfileStats);
router.get('/:id/logs', optionalAuth, getUserLogs);
router.get('/:id/feed', optionalAuth, getUserFeed);

router.post('/:id/follow/:targetId', optionalAuth, followUser);
router.delete('/:id/follow/:targetId', optionalAuth, unfollowUser);
router.get('/:id/is-following/:targetId', optionalAuth, isFollowing);
router.get('/:id/following', optionalAuth, getFollowing);
router.get('/:id/followers', optionalAuth, getFollowers);

export default router;
