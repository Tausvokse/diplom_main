import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Initialize Supabase client
// Note: We use the service role key to bypass RLS on the server side
// The URL should be the base project URL (https://xyz.supabase.co)
// We'll strip /rest/v1/ if it was accidentally provided by the user in .env

const supabaseUrl = config.supabase.url.replace(/\/rest\/v1\/?$/, '');

export const supabase = createClient(supabaseUrl, config.supabase.key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
