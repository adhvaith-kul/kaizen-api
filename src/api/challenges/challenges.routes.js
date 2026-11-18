import express from 'express';
import {
  getChallenges,
  getUserChallenge,
  joinChallenge,
  getChallengeHabits,
  getChallengeLogs,
  syncChallengeStreak,
} from './challenges.controller.js';
import { auth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getChallenges);
router.get('/:id/user/:userId', auth, getUserChallenge);
router.post('/:id/join', auth, joinChallenge);
router.get('/:id/habits', auth, getChallengeHabits);
router.get('/:id/logs', auth, getChallengeLogs);
router.post('/:id/sync-streak', auth, syncChallengeStreak);

export default router;
