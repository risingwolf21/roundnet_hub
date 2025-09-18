import { createClient } from '@supabase/supabase-js';
import { Database } from 'src/types/supabase-generated.types';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_API_KEY;

export const supabase = createClient<Database>(supabaseUrl ?? '', supabaseKey ?? '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      app_version: process.env.REACT_APP_VERSION ?? '',
    },
  },
});
