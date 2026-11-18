import { supabase } from '../../config/supabase.js';

const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export const recalculateUserPoints = async (userId, groupId) => {
  try {
    const { data: groupData } = await supabase.from('groups').select('*').eq('id', groupId).single();
    const { data: members } = await supabase
      .from('members')
      .select('user_id')
      .eq('group_id', groupId)
      .is('deleted_at', null);

    const memberCount = (members || []).length;
    const ptsPerCat = groupData?.settings?.pointsPerCategory || {};

    const { data: logs } = await supabase
      .from('logs')
      .select('id, habits(category)')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .is('deleted_at', null);

    if (!logs || logs.length === 0) {
      await supabase
        .from('members')
        .update({ total_points: 0 })
        .eq('user_id', userId)
        .eq('group_id', groupId);
      return;
    }

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

    let totalPoints = 0;
    logs.forEach((log) => {
      const suspectsCount = suspectsByLog[log.id] || 0;
      const isDisqualified = memberCount > 0 && suspectsCount >= memberCount / 2;

      if (!isDisqualified) {
        const habData = log.habits;
        const category = (Array.isArray(habData) ? habData[0]?.category : habData?.category) || 'Health';
        const pts = Number(ptsPerCat[category] || 10);
        totalPoints += pts;
      }
    });

    await supabase
      .from('members')
      .update({ total_points: totalPoints })
      .eq('user_id', userId)
      .eq('group_id', groupId);
  } catch (e) {
    console.error('[recalculateUserPoints] Error:', e);
  }
};

export const recalculateGroupPoints = async (groupId) => {
  try {
    const { data: members } = await supabase
      .from('members')
      .select('user_id')
      .eq('group_id', groupId)
      .is('deleted_at', null);
    if (!members) return;

    await Promise.all(members.map((m) => recalculateUserPoints(m.user_id, groupId)));
  } catch (e) {
    console.error('[recalculateGroupPoints] Error:', e);
  }
};

export const createGroup = async (req, res, next) => {
  try {
    const { name, userId, settings } = req.body;
    const effectiveUserId = req.user.userId;

    if (userId && userId !== effectiveUserId) {
      return res.status(403).json({ error: 'Forbidden: You can only create squads for yourself' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name and userId are required' });
    }

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name,
        code: generateCode(),
        created_by: effectiveUserId,
        settings,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Auto-join group for creator
    await supabase
      .from('members')
      .upsert({ user_id: effectiveUserId, group_id: group.id, deleted_at: null }, { onConflict: 'user_id, group_id' });

    return res.status(201).json({
      id: group.id,
      name: group.name,
      code: group.code,
      createdBy: group.created_by,
      settings: group.settings,
    });
  } catch (err) {
    next(err);
  }
};

export const getGroupByCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .select('*')
      .eq('code', code)
      .is('deleted_at', null)
      .maybeSingle();

    if (groupErr) return res.status(400).json({ error: groupErr.message });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    return res.json({
      id: group.id,
      name: group.name,
      code: group.code,
      createdBy: group.created_by,
      settings: group.settings,
    });
  } catch (err) {
    next(err);
  }
};

export const joinGroupByCode = async (req, res, next) => {
  try {
    const { code, userId } = req.body;
    const effectiveUserId = req.user.userId;

    if (userId && userId !== effectiveUserId) {
      return res.status(403).json({ error: 'Forbidden: You can only join squads for yourself' });
    }

    if (!code) {
      return res.status(400).json({ error: 'Code and userId are required' });
    }

    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .select('*')
      .eq('code', code)
      .is('deleted_at', null)
      .maybeSingle();

    if (groupErr) return res.status(400).json({ error: groupErr.message });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const { error: memberErr } = await supabase
      .from('members')
      .upsert({ user_id: effectiveUserId, group_id: group.id, deleted_at: null }, { onConflict: 'user_id, group_id' });

    if (memberErr) return res.status(400).json({ error: memberErr.message });

    return res.json({
      id: group.id,
      name: group.name,
      code: group.code,
      createdBy: group.created_by,
      settings: group.settings,
    });
  } catch (err) {
    next(err);
  }
};

export const getUserGroups = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: You can only view your own squads' });
    }

    const { data: members } = await supabase
      .from('members')
      .select('group_id')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (!members || members.length === 0) return res.json([]);

    const groupIds = members.map((m) => m.group_id);
    const { data: groups } = await supabase.from('groups').select('*').in('id', groupIds).is('deleted_at', null);
    if (!groups) return res.json([]);

    return res.json(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        code: g.code,
        createdBy: g.created_by,
        settings: g.settings,
      }))
    );
  } catch (err) {
    next(err);
  }
};

export const updateGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, settings } = req.body;

    const { data: group, error: fetchErr } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) return res.status(400).json({ error: fetchErr.message });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.created_by !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: Only the squad creator can modify this squad' });
    }

    const { error } = await supabase.from('groups').update({ name, settings }).eq('id', id);
    if (error) return res.status(400).json({ error: error.message });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const deleteGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: group, error: fetchErr } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) return res.status(400).json({ error: fetchErr.message });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.created_by !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: Only the squad creator can delete this squad' });
    }

    const { error } = await supabase.from('groups').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) return res.status(400).json({ error: error.message });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const getLeaderboard = async (req, res, next) => {
  try {
    const { id: groupId } = req.params;

    // Force recalculate points for group members
    await recalculateGroupPoints(groupId);

    const { data: members } = await supabase
      .from('members')
      .select('user_id, total_points, groups!inner(deleted_at)')
      .eq('group_id', groupId)
      .is('deleted_at', null)
      .is('groups.deleted_at', null);

    if (!members || members.length === 0) return res.json([]);

    const userIds = members.map((m) => m.user_id);
    const { data: users } = await supabase.from('users').select('id, username, avatar_url').in('id', userIds);

    const board = members.map((m) => ({
      userId: m.user_id,
      username: users?.find((u) => u.id === m.user_id)?.username || 'Unknown',
      avatarUrl: users?.find((u) => u.id === m.user_id)?.avatar_url ?? undefined,
      totalPoints: m.total_points || 0,
    }));

    board.sort((a, b) => b.totalPoints - a.totalPoints || a.username.localeCompare(b.username));

    let rank = 1;
    const rankedBoard = board.map((item, index) => {
      if (index > 0 && item.totalPoints < board[index - 1].totalPoints) {
        rank = index + 1;
      }
      return { rank, ...item };
    });

    return res.json(rankedBoard);
  } catch (err) {
    next(err);
  }
};
