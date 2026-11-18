import { supabase } from '../../config/supabase.js';

export const getFeed = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const effectiveUserId = userId || req.user?.userId;

    if (!effectiveUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data: memberOf } = await supabase
      .from('members')
      .select('group_id, groups!inner(deleted_at)')
      .eq('user_id', effectiveUserId)
      .is('groups.deleted_at', null);

    if (!memberOf || memberOf.length === 0) return res.json([]);
    const groupIds = memberOf.map((m) => m.group_id);

    // Get all user IDs in the user's squads to include their challenge logs in the feed
    const { data: squadMembers } = await supabase
      .from('members')
      .select('user_id')
      .in('group_id', groupIds)
      .is('deleted_at', null);

    const squadMemberIds = Array.from(new Set((squadMembers || []).map((m) => m.user_id)));

    const [logsResult, suspectsResult] = await Promise.all([
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
        .or(`group_id.in.(${groupIds.join(',')}),and(group_id.is.null,user_id.in.(${squadMemberIds.join(',')}))`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('suspects')
        .select('log_id, user_id, deleted_at')
        .is('deleted_at', null),
    ]);

    const { data: logs, error } = logsResult;
    if (error || !logs) return res.json([]);

    const suspectsByLog = {};
    for (const s of suspectsResult.data || []) {
      if (!suspectsByLog[s.log_id]) suspectsByLog[s.log_id] = [];
      suspectsByLog[s.log_id].push(s);
    }

    const formatted = logs
      .filter((log) => log.habits && log.users)
      .map((log) => {
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
        };
      });

    return res.json(formatted);
  } catch (err) {
    next(err);
  }
};
