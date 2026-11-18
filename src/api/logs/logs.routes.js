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
import { auth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/today', auth, getTodayLog);
router.post('/toggle', auth, toggleHabit);

router.get('/:id', auth, getPostDetail);
router.post('/:id/suspect', auth, suspectLog);
router.post('/:id/unsuspect', auth, unsuspectLog);
router.post('/:id/like', auth, likeLog);
router.post('/:id/unlike', auth, unlikeLog);
router.get('/:id/comments', auth, getComments);
router.post('/:id/comments', auth, addComment);

export default router;
