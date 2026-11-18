import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../../config/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'kaizen-jwt-secret-key-change-in-production';

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

export const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    let hashedPassword = null;
    if (password && typeof password === 'string') {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const { data, error } = await supabase
      .from('users')
      .insert({ username, email, password: hashedPassword })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const token = generateToken(data);
    const user = {
      id: data.id,
      username: data.username,
      email: data.email,
      avatarUrl: data.avatar_url ?? undefined,
    };

    return res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    if (!data) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (data.password && password) {
      const isMatch = await bcrypt.compare(String(password), String(data.password));
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else if (password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(data);
    const user = {
      id: data.id,
      username: data.username,
      email: data.email,
      avatarUrl: data.avatar_url ?? undefined,
    };

    return res.json({ user, token });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.userId)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ error: 'User not found' });
    }

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
