import { supabase } from '../../config/supabase.js';
import { getISTDate } from '../logs/logs.controller.js';

export const getChallenges = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('challenges').select('*');
    if (error) return res.status(400).json({ error: error.message });

    return res.json(
      (data || []).map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        duration: c.duration,
        habits: c.habits,
        createdAt: c.created_at,
      }))
    );
  } catch (err) {
    next(err);
  }
};

export const getUserChallenge = async (req, res, next) => {
  try {
    const { id: challengeId, userId } = req.params;
    const effectiveUserId = req.user?.userId || userId;

    if (userId && req.user?.userId && userId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden: Cannot access another user's challenge" });
    }

    if (!effectiveUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data, error } = await supabase
      .from('user_challenges')
      .select('*, challenges(*)')
      .eq('user_id', effectiveUserId)
      .eq('challenge_id', challengeId)
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.json(null);

    return res.json({
      id: data.id,
      userId: data.user_id,
      challengeId: data.challenge_id,
      startDate: data.start_date,
      currentStreak: data.current_streak,
      isCompleted: data.is_completed,
      isFailed: data.is_failed,
      lastCheckDate: data.last_check_date,
      createdAt: data.created_at,
      challenge: {
        id: data.challenges?.id,
        name: data.challenges?.name,
        description: data.challenges?.description,
        duration: data.challenges?.duration,
        habits: data.challenges?.habits,
        createdAt: data.challenges?.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const joinChallenge = async (req, res, next) => {
  try {
    const { id: challengeId } = req.params;
    const { userId } = req.body;
    const effectiveUserId = req.user?.userId || userId;

    if (userId && req.user?.userId && userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot join challenge on behalf of another user' });
    }

    if (!effectiveUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data: challenge } = await supabase.from('challenges').select('*').eq('id', challengeId).single();
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const date = getISTDate();

    const { data, error } = await supabase
      .from('user_challenges')
      .insert({
        user_id: effectiveUserId,
        challenge_id: challengeId,
        start_date: date,
        current_streak: 0,
      })
      .select('*, challenges(*)')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Create habits for this challenge
    const habitsToCreate = (challenge.habits || []).map((h) => ({
      user_id: effectiveUserId,
      group_id: null,
      challenge_id: challengeId,
      category: h.category,
      name: h.name,
    }));

    if (habitsToCreate.length > 0) {
      const { error: habitErr } = await supabase.from('habits').insert(habitsToCreate);
      if (habitErr) return res.status(400).json({ error: habitErr.message });
    }

    return res.status(201).json({
      id: data.id,
      userId: data.user_id,
      challengeId: data.challenge_id,
      startDate: data.start_date,
      currentStreak: data.current_streak,
      isCompleted: data.is_completed,
      isFailed: data.is_failed,
      createdAt: data.created_at,
      challenge: {
        id: data.challenges?.id,
        name: data.challenges?.name,
        description: data.challenges?.description,
        duration: data.challenges?.duration,
        habits: data.challenges?.habits,
        createdAt: data.challenges?.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getChallengeHabits = async (req, res, next) => {
  try {
    const { id: challengeId } = req.params;
    const { userId } = req.query;
    const effectiveUserId = req.user?.userId || userId;

    if (userId && req.user?.userId && userId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden: Cannot access another user's challenge habits" });
    }

    if (!effectiveUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('challenge_id', challengeId)
      .is('deleted_at', null);

    if (error) return res.status(400).json({ error: error.message });

    return res.json(
      (data || []).map((h) => ({
        id: h.id,
        userId: h.user_id,
        groupId: h.group_id,
        category: h.category,
        name: h.name,
      }))
    );
  } catch (err) {
    next(err);
  }
};

export const getChallengeLogs = async (req, res, next) => {
  try {
    const { id: challengeId } = req.params;
    const { userId, date } = req.query;
    const effectiveUserId = req.user?.userId || userId;
    const effectiveDate = date || getISTDate();

    if (userId && req.user?.userId && userId !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden: Cannot access another user's challenge logs" });
    }

    if (!effectiveUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', effectiveUserId)
      .eq('challenge_id', challengeId);

    if (!habits || habits.length === 0) return res.json([]);
    const habitIds = habits.map((h) => h.id);

    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('date', effectiveDate)
      .in('habit_id', habitIds)
      .is('deleted_at', null);

    if (error) return res.status(400).json({ error: error.message });

    return res.json(
      (data || []).map((d) => ({
        id: d.id,
        userId: d.user_id,
        groupId: d.group_id,
        habitId: d.habit_id,
        date: d.date,
        imageUrl: d.image_url,
        createdAt: d.created_at,
      }))
    );
  } catch (err) {
    next(err);
  }
};

export const syncChallengeStreak = async (req, res, next) => {
  try {
    const { id: challengeId } = req.params;
    const { userId } = req.body;
    const effectiveUserId = req.user?.userId || userId;

    if (userId && req.user?.userId && userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot sync streak on behalf of another user' });
    }

    if (!effectiveUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data: userChallenge } = await supabase
      .from('user_challenges')
      .select('*, challenges(*)')
      .eq('user_id', effectiveUserId)
      .eq('challenge_id', challengeId)
      .maybeSingle();

    if (!userChallenge) {
      return res.status(404).json({ error: 'User challenge not found' });
    }

    if (userChallenge.is_completed || userChallenge.is_failed) {
      return res.json({
        id: userChallenge.id,
        userId: userChallenge.user_id,
        challengeId: userChallenge.challenge_id,
        startDate: userChallenge.start_date,
        currentStreak: userChallenge.current_streak,
        isCompleted: userChallenge.is_completed,
        isFailed: userChallenge.is_failed,
        lastCheckDate: userChallenge.last_check_date,
        createdAt: userChallenge.created_at,
        challenge: userChallenge.challenges,
      });
    }

    const d = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDateObj = new Date(d.getTime() + istOffset);
    const today = istDateObj.toISOString().split('T')[0];

    // If already checked today, return current
    if (userChallenge.last_check_date === today) {
      return res.json({
        id: userChallenge.id,
        userId: userChallenge.user_id,
        challengeId: userChallenge.challenge_id,
        startDate: userChallenge.start_date,
        currentStreak: userChallenge.current_streak,
        isCompleted: userChallenge.is_completed,
        isFailed: userChallenge.is_failed,
        lastCheckDate: userChallenge.last_check_date,
        createdAt: userChallenge.created_at,
        challenge: userChallenge.challenges,
      });
    }

    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', effectiveUserId)
      .eq('challenge_id', challengeId);

    const habitCount = (habits || []).length;
    const habitIds = (habits || []).map((h) => h.id);

    let calcStreak = 0;
    let checkDate = istDateObj;

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dateStr < userChallenge.start_date) break;

      let logCount = 0;
      if (habitCount > 0) {
        const { data: logs } = await supabase
          .from('logs')
          .select('id')
          .eq('user_id', effectiveUserId)
          .eq('date', dateStr)
          .in('habit_id', habitIds)
          .is('deleted_at', null);
        logCount = (logs || []).length;
      }

      if (logCount === habitCount && habitCount > 0) {
        calcStreak++;
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        if (dateStr === today) {
          checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
          continue;
        }
        break;
      }
    }

    const newStreak = calcStreak;
    const isCompleted = newStreak >= 75;

    const { data: updated, error: updateErr } = await supabase
      .from('user_challenges')
      .update({
        current_streak: newStreak,
        last_check_date: today,
        is_completed: isCompleted,
      })
      .eq('id', userChallenge.id)
      .select('*, challenges(*)')
      .single();

    if (updateErr) return res.status(400).json({ error: updateErr.message });

    return res.json({
      id: updated.id,
      userId: updated.user_id,
      challengeId: updated.challenge_id,
      startDate: updated.start_date,
      currentStreak: updated.current_streak,
      isCompleted: updated.is_completed,
      isFailed: updated.is_failed,
      lastCheckDate: updated.last_check_date,
      createdAt: updated.created_at,
      challenge: updated.challenges,
    });
  } catch (err) {
    next(err);
  }
};
