import path from 'path';
import { supabase } from '../../config/supabase.js';

export const uploadProfileImage = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.user?.userId || 'unknown-user';
    let fileBuffer;
    let contentType = 'image/jpeg';
    let ext = 'jpg';

    if (req.file) {
      fileBuffer = req.file.buffer;
      contentType = req.file.mimetype || 'image/jpeg';
      ext = path.extname(req.file.originalname).replace('.', '') || 'jpg';
    } else if (req.body.imageBase64) {
      const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
      contentType = req.body.contentType || 'image/jpeg';
      ext = req.body.ext || 'jpg';
    } else {
      return res.status(400).json({ error: 'No image file or base64 provided' });
    }

    const filename = `${userId}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from('profile-images')
      .upload(filename, fileBuffer, {
        upsert: true,
        contentType,
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data: publicUrlData } = supabase.storage.from('profile-images').getPublicUrl(filename);
    const publicUrl = publicUrlData?.publicUrl;

    return res.json({
      success: true,
      url: publicUrl,
      publicUrl,
    });
  } catch (err) {
    next(err);
  }
};

export const uploadHabitImage = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.user?.userId || 'unknown-user';
    const habitId = req.body.habitId || 'habit';
    const date = req.body.date || new Date().toISOString().split('T')[0];
    let fileBuffer;
    let contentType = 'image/jpeg';
    let ext = 'jpg';

    if (req.file) {
      fileBuffer = req.file.buffer;
      contentType = req.file.mimetype || 'image/jpeg';
      ext = path.extname(req.file.originalname).replace('.', '') || 'jpg';
    } else if (req.body.imageBase64) {
      const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
      contentType = req.body.contentType || 'image/jpeg';
      ext = req.body.ext || 'jpg';
    } else {
      return res.status(400).json({ error: 'No image file or base64 provided' });
    }

    const filename = `${userId}/${date}/${habitId}.${ext}`;

    const { error } = await supabase.storage
      .from('habit-images')
      .upload(filename, fileBuffer, {
        upsert: true,
        contentType,
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data: publicUrlData } = supabase.storage.from('habit-images').getPublicUrl(filename);
    const publicUrl = publicUrlData?.publicUrl;

    return res.json({
      success: true,
      url: publicUrl,
      publicUrl,
    });
  } catch (err) {
    next(err);
  }
};
