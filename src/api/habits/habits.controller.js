import { supabase } from '../../config/supabase.js';

export const getHabits = async (req, res, next) => {
  try {
    const { userId, groupId } = req.query;
    const effectiveUserId = req.user.userId;

    if (userId && userId !== effectiveUserId) {
      return res.status(403).json({ error: 'Forbidden: You can only view your own habits' });
    }

    if (!groupId) {
      return res.status(400).json({ error: 'userId and groupId are required' });
    }

    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('group_id', groupId)
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

export const saveHabits = async (req, res, next) => {
  try {
    const { userId, groupId, habits } = req.body;
    const effectiveUserId = req.user.userId;

    if (userId && userId !== effectiveUserId) {
      return res.status(403).json({ error: 'Forbidden: You can only save your own habits' });
    }

    if (!groupId || !Array.isArray(habits)) {
      return res.status(400).json({ error: 'userId, groupId and habits array are required' });
    }

    // Soft-delete previous habits for this user + squad
    await supabase
      .from('habits')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', effectiveUserId)
      .eq('group_id', groupId)
      .is('deleted_at', null);

    const { data, error } = await supabase
      .from('habits')
      .insert(
        habits.map((h) => ({
          user_id: effectiveUserId,
          group_id: groupId,
          category: h.category,
          name: h.name,
          deleted_at: null,
        }))
      )
      .select();

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
