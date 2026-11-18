import { supabase } from '../../config/supabase.js';

export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'User not found' });

    return res.json({
      id: data.id,
      username: data.username,
      email: data.email,
      avatarUrl: data.avatar_url ?? undefined,
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserAvatar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { avatarUrl } = req.body;

    if (req.user?.userId && id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot update avatar for another user' });
    }

    const { error } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', id);

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, avatarUrl });
  } catch (err) {
    next(err);
  }
};

export const getProfileStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [logsRes, squadsRes] = await Promise.all([
      supabase.from('logs').select('date').eq('user_id', id).is('deleted_at', null),
      supabase.from('members').select('group_id').eq('user_id', id).is('deleted_at', null),
    ]);

    const logs = logsRes.data || [];
    const squads = squadsRes.data || [];
    const distinctDays = new Set(logs.map(l => l.date)).size;

    return res.json({
      totalHabits: logs.length,
      totalDaysLogged: distinctDays,
      totalSquads: squads.length,
    });
  } catch (err) {
    next(err);
  }
};

export const getUserLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { groupId } = req.query;

    let query = supabase
      .from('logs')
      .select(`
        *,
        groups(members(user_id))
      `)
      .eq('user_id', id)
      .is('deleted_at', null);

    if (groupId) query = query.eq('group_id', groupId);
    const { data: logs, error } = await query.order('date', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    if (!logs || logs.length === 0) return res.json([]);

    const logIds = logs.map((l) => l.id);
    const { data: suspects } = await supabase
      .from('suspects')
      .select('log_id, user_id, deleted_at')
      .in('log_id', logIds)
      .is('deleted_at', null);

    const suspectsByLog = {};
    for (const s of suspects || []) {
      suspectsByLog[s.log_id] = (suspectsByLog[s.log_id] || 0) + 1;
    }

    const result = logs.map((d) => ({
      id: d.id,
      userId: d.user_id,
      groupId: d.group_id,
      habitId: d.habit_id,
      date: d.date,
      imageUrl: d.image_url,
      createdAt: d.created_at,
      suspectsCount: suspectsByLog[d.id] || 0,
      isDisqualified: (suspectsByLog[d.id] || 0) >= (d.groups?.members?.length || 0) / 2,
    }));

    return res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getUserFeed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { groupId } = req.query;

    let query = supabase
      .from('logs')
      .select(`
        *,
        users(username, avatar_url),
        groups(name, members(user_id)),
        habits(name, category),
        likes(user_id, deleted_at),
        comments(id, text, user_id, created_at, deleted_at, users(username))
      `)
      .eq('user_id', id)
      .is('deleted_at', null);

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    const [logsResult, suspectsResult] = await Promise.all([
      query.order('created_at', { ascending: false }),
      supabase.from('suspects').select('log_id, user_id, deleted_at').is('deleted_at', null),
    ]);

    const { data: logs, error } = logsResult;
    if (error || !logs) return res.json([]);

    const suspectsByLog = {};
    for (const s of suspectsResult.data || []) {
      if (!suspectsByLog[s.log_id]) suspectsByLog[s.log_id] = [];
      suspectsByLog[s.log_id].push(s);
    }

    const currentViewerId = req.user?.userId || id;

    const formatted = logs
      .filter(log => log.habits && log.users)
      .map(log => {
        const suspects = suspectsByLog[log.id] || [];
        const memberCount = log.groups?.members?.length || 0;
        return {
          id: log.id,
          userId: log.user_id,
          username: log.users.username,
          avatarUrl: log.users.avatar_url,
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
          isLiked: log.likes?.some((l) => l.user_id === currentViewerId && !l.deleted_at),
          isSuspected: suspects.some(s => s.user_id === currentViewerId),
          isDisqualified: memberCount > 0 && suspects.length >= memberCount / 2,
          commentsPreview: (log.comments || [])
            .filter((c) => !c.deleted_at)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .slice(-2)
            .map((c) => ({
              username: c.users?.username ?? '',
              text: c.text,
            })),
        };
      });

    return res.json(formatted);
  } catch (err) {
    next(err);
  }
};

export const followUser = async (req, res, next) => {
  try {
    const { id, targetId } = req.params;
    if (req.user?.userId && id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot perform follow action for another user' });
    }
    const followerId = req.user?.userId || id;
    const { error } = await supabase.from('follows').insert({ follower_id: followerId, following_id: targetId });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const unfollowUser = async (req, res, next) => {
  try {
    const { id, targetId } = req.params;
    if (req.user?.userId && id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot perform unfollow action for another user' });
    }
    const followerId = req.user?.userId || id;
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', targetId);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const isFollowing = async (req, res, next) => {
  try {
    const { id, targetId } = req.params;
    const followerId = req.user?.userId || id;
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', targetId)
      .maybeSingle();

    if (error) return res.json({ isFollowing: false });
    return res.json({ isFollowing: !!data });
  } catch (err) {
    next(err);
  }
};

export const getFollowing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('follows')
      .select('following:following_id(id, username, email, avatar_url)')
      .eq('follower_id', id);

    if (error || !data) return res.json([]);
    return res.json(data.map((d) => ({
      id: d.following.id,
      username: d.following.username,
      email: d.following.email,
      avatarUrl: d.following.avatar_url ?? undefined,
    })));
  } catch (err) {
    next(err);
  }
};

export const getFollowers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('follows')
      .select('follower:follower_id(id, username, email, avatar_url)')
      .eq('following_id', id);

    if (error || !data) return res.json([]);
    return res.json(data.map((d) => ({
      id: d.follower.id,
      username: d.follower.username,
      email: d.follower.email,
      avatarUrl: d.follower.avatar_url ?? undefined,
    })));
  } catch (err) {
    next(err);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const { q = '', currentUserId = '' } = req.query;
    let query = supabase
      .from('users')
      .select('id, username, email, avatar_url')
      .is('deleted_at', null)
      .ilike('username', `%${q}%`)
      .limit(20);

    if (currentUserId) {
      query = query.neq('id', currentUserId);
    }

    const { data, error } = await query;
    if (error || !data) return res.json([]);

    return res.json(data.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      avatarUrl: u.avatar_url ?? undefined,
    })));
  } catch (err) {
    next(err);
  }
};
