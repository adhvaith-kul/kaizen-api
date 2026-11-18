import express from 'express';
import {
  getTodayLog,
  toggleHabit,
  suspectLog,
  unsuspectLog,
  likeLog,
  unlikeLog,
  getComments,
  addComment,
  getPostDetail,
} from './logs.controller.js';
import { optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/today', optionalAuth, getTodayLog);
router.post('/toggle', optionalAuth, toggleHabit);

router.get('/:id', optionalAuth, getPostDetail);
router.post('/:id/suspect', optionalAuth, suspectLog);
router.post('/:id/unsuspect', optionalAuth, unsuspectLog);
router.post('/:id/like', optionalAuth, likeLog);
router.post('/:id/unlike', optionalAuth, unlikeLog);
router.get('/:id/comments', optionalAuth, getComments);
router.post('/:id/comments', optionalAuth, addComment);

export default router;
