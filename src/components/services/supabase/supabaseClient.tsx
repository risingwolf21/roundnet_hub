import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../types/supabase-generated.types';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  global: {
    headers: {
      app_version: process.env.REACT_APP_VERSION ?? '',
    },
  },
});
