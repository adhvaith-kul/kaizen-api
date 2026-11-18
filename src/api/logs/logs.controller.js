import { supabase } from '../../config/supabase.js';
import { recalculateUserPoints } from '../groups/groups.controller.js';

export const getISTDate = () => {
  const d = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDateObj = new Date(d.getTime() + istOffset);
  return istDateObj.toISOString().split('T')[0];
};

export const getTodayLog = async (req, res, next) => {
  try {
    const { userId, groupId } = req.query;
    const effectiveUserId = req.user.userId;

    if (userId && userId !== effectiveUserId) {
      return res.status(403).json({ error: 'Forbidden: You can only view your own logs' });
    }

    const date = getISTDate();
    let query = supabase
      .from('logs')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('date', date)
      .is('deleted_at', null);

    if (groupId) {
      query = query.eq('group_id', groupId);
    } else {
      query = query.is('group_id', null);
    }

    const { data, error } = await query;
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

export const toggleHabit = async (req, res, next) => {
  try {
    const { userId, groupId, habitId, imageUrl, caption } = req.body;
    const effectiveUserId = req.user.userId;

    if (userId && userId !== effectiveUserId) {
      return res.status(403).json({ error: 'Forbidden: You can only toggle your own habits' });
    }

    if (!habitId) {
      return res.status(400).json({ error: 'userId and habitId are required' });
    }

    const date = getISTDate();

    // Check existing today's log
    let query = supabase
      .from('logs')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('habit_id', habitId)
      .eq('date', date)
      .is('deleted_at', null);

    if (groupId) {
      query = query.eq('group_id', groupId);
    } else {
      query = query.is('group_id', null);
    }

    const { data: existingLogs } = await query;
    const existingLog = existingLogs && existingLogs.length > 0 ? existingLogs[0] : null;

    if (existingLog) {
      const { error } = await supabase
        .from('logs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', existingLog.id);
      if (error) return res.status(400).json({ error: error.message });
    } else {
      const { error } = await supabase.from('logs').insert({
        user_id: effectiveUserId,
        group_id: groupId || null,
        habit_id: habitId,
        date,
        image_url: imageUrl || null,
        caption: caption || null,
      });
      if (error) return res.status(400).json({ error: error.message });
    }

    // Recalculate squad points if squad habit
    if (groupId) {
      await recalculateUserPoints(effectiveUserId, groupId);
    }

    // Return updated logs for today
    let refreshQuery = supabase
      .from('logs')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('date', date)
      .is('deleted_at', null);

    if (groupId) {
      refreshQuery = refreshQuery.eq('group_id', groupId);
    } else {
      refreshQuery = refreshQuery.is('group_id', null);
    }

    const { data: updatedLogs, error: refreshError } = await refreshQuery;
    if (refreshError) return res.status(400).json({ error: refreshError.message });

    return res.json(
      (updatedLogs || []).map((d) => ({
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

export const suspectLog = async (req, res, next) => {
  try {
    const { id: logId } = req.params;
    const { userId } = req.body;
    const effectiveUserId = req.user?.userId || userId;
    if (userId && req.user?.userId && userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot perform action on behalf of another user' });
    }

    const { data: logData } = await supabase.from('logs').select('user_id, group_id').eq('id', logId).single();
    if (!logData) return res.status(404).json({ error: 'Log not found' });

    const { error } = await supabase
      .from('suspects')
      .upsert({ user_id: effectiveUserId, log_id: logId, deleted_at: null }, { onConflict: 'user_id, log_id' });
    if (error) return res.status(400).json({ error: error.message });

    if (logData.group_id) {
      await recalculateUserPoints(logData.user_id, logData.group_id);
    }

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const unsuspectLog = async (req, res, next) => {
  try {
    const { id: logId } = req.params;
    const { userId } = req.body;
    const effectiveUserId = req.user?.userId || userId;
    if (userId && req.user?.userId && userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot perform action on behalf of another user' });
    }

    const { data: logData } = await supabase.from('logs').select('user_id, group_id').eq('id', logId).single();
    if (!logData) return res.status(404).json({ error: 'Log not found' });

    const { error } = await supabase
      .from('suspects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', effectiveUserId)
      .eq('log_id', logId);
    if (error) return res.status(400).json({ error: error.message });

    if (logData.group_id) {
      await recalculateUserPoints(logData.user_id, logData.group_id);
    }

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const likeLog = async (req, res, next) => {
  try {
    const { id: logId } = req.params;
    const { userId } = req.body;
    const effectiveUserId = req.user?.userId || userId;
    if (userId && req.user?.userId && userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot perform action on behalf of another user' });
    }

    const { error } = await supabase
      .from('likes')
      .upsert({ user_id: effectiveUserId, log_id: logId, deleted_at: null }, { onConflict: 'user_id, log_id' });
    if (error) return res.status(400).json({ error: error.message });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const unlikeLog = async (req, res, next) => {
  try {
    const { id: logId } = req.params;
    const { userId } = req.body;
    const effectiveUserId = req.user?.userId || userId;
    if (userId && req.user?.userId && userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot perform action on behalf of another user' });
    }

    const { error } = await supabase
      .from('likes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', effectiveUserId)
      .eq('log_id', logId);
    if (error) return res.status(400).json({ error: error.message });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const getComments = async (req, res, next) => {
  try {
    const { id: logId } = req.params;

    const { data, error } = await supabase
      .from('comments')
      .select('*, users(username, avatar_url)')
      .eq('log_id', logId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    return res.json(
      (data || []).map((c) => ({
        id: c.id,
        userId: c.user_id,
        username: c.users?.username ?? '',
        avatarUrl: c.users?.avatar_url,
        logId: c.log_id,
        text: c.text,
        createdAt: c.created_at,
      }))
    );
  } catch (err) {
    next(err);
  }
};

export const addComment = async (req, res, next) => {
  try {
    const { id: logId } = req.params;
    const { userId, text } = req.body;
    const effectiveUserId = req.user?.userId || userId;
    if (userId && req.user?.userId && userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot perform action on behalf of another user' });
    }

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const { error } = await supabase.from('comments').insert({
      user_id: effectiveUserId,
      log_id: logId,
      text,
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const getPostDetail = async (req, res, next) => {
  try {
    const { id: logId } = req.params;
    const { userId } = req.query;
    const effectiveUserId = userId || req.user?.userId;

    const [logResult, suspectsResult] = await Promise.all([
      supabase
        .from('logs')
        .select(`
          *,
          users(username, avatar_url),
          groups(name, members(user_id)),
          habits(name, category),
          likes(user_id, deleted_at),
          comments(id, text, user_id, created_at, deleted_at, users(username))
        `)
        .eq('id', logId)
        .is('deleted_at', null)
        .single(),
      supabase
        .from('suspects')
        .select('log_id, user_id, deleted_at')
        .eq('log_id', logId)
        .is('deleted_at', null),
    ]);

    const { data: log, error } = logResult;
    if (error || !log) return res.status(404).json({ error: 'Post not found' });

    const suspects = suspectsResult.data || [];
    const memberCount = log.groups?.members?.length || 0;

    return res.json({
      id: log.id,
      userId: log.user_id,
      username: log.users?.username ?? 'Unknown',
      avatarUrl: log.users?.avatar_url,
      groupName: log.groups?.name ?? '',
      groupId: log.group_id,
      habitName: log.habits?.name ?? 'Habit',
      category: log.habits?.category ?? 'Health',
      imageUrl: log.image_url,
      caption: log.caption,
      date: log.date,
      timestamp: new Date(log.created_at).getTime(),
      likesCount: log.likes?.filter((l) => !l.deleted_at).length || 0,
      suspectsCount: suspects.length,
      commentsCount: log.comments?.filter((c) => !c.deleted_at).length || 0,
      isLiked: log.likes?.some((l) => l.user_id === effectiveUserId && !l.deleted_at),
      isSuspected: suspects.some((s) => s.user_id === effectiveUserId),
      isDisqualified: memberCount > 0 && suspects.length >= memberCount / 2,
      commentsPreview: (log.comments || [])
        .filter((c) => !c.deleted_at)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(-2)
        .map((c) => ({
          username: c.users?.username ?? '',
          text: c.text,
        })),
    });
  } catch (err) {
    next(err);
  }
};
