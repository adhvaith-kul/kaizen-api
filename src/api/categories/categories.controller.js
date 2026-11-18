import { supabase } from '../../config/supabase.js';

export const DEFAULT_CATEGORIES = [
  { label: 'Health', emoji: '💪' },
  { label: 'Finance', emoji: '💸' },
  { label: 'Work', emoji: '💼' },
  { label: 'Upskill', emoji: '🧠' },
  { label: 'Social', emoji: '🥂' },
];

export const getCategories = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('label, emoji')
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return res.json(DEFAULT_CATEGORIES);
    }
    return res.json(data.map(row => ({ label: row.label, emoji: row.emoji })));
  } catch (err) {
    next(err);
  }
};
