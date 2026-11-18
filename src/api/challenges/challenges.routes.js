import express from 'express';
import {
  getChallenges,
  getUserChallenge,
  joinChallenge,
  getChallengeHabits,
  getChallengeLogs,
  syncChallengeStreak,
} from './challenges.controller.js';
import { optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, getChallenges);
router.get('/:id/user/:userId', optionalAuth, getUserChallenge);
router.post('/:id/join', optionalAuth, joinChallenge);
router.get('/:id/habits', optionalAuth, getChallengeHabits);
router.get('/:id/logs', optionalAuth, getChallengeLogs);
router.post('/:id/sync-streak', optionalAuth, syncChallengeStreak);

export default router;
