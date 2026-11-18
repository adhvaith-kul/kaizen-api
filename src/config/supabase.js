import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { warnLog } from '../utils/logger.js';

dotenv.config();

const defaultSupabaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@db.')
  ? `https://${process.env.DATABASE_URL.split('@db.')[1]?.split('.supabase.co')[0]}.supabase.co`
  : '';

let rawUrl = process.env.SUPABASE_URL || defaultSupabaseUrl || 'https://placeholder.supabase.co';
let supabaseUrl = 'https://placeholder.supabase.co';

try {
  if (rawUrl && !rawUrl.includes('[') && !rawUrl.includes(']')) {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      supabaseUrl = rawUrl;
    }
  }
} catch {
  supabaseUrl = 'https://placeholder.supabase.co';
}

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

if (
  !process.env.SUPABASE_URL ||
  process.env.SUPABASE_URL.includes('[ref]') ||
  (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)
) {
  warnLog('Supabase credentials are using placeholder values. Configure valid keys in .env for live database calls.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
