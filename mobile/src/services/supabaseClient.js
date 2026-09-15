import 'react-native-url-polyfill/auto.js';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Simple token/role-based admin & security
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
