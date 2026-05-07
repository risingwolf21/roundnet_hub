import { Database } from '@/types/supabase-generated.types';
import { createClient } from '@supabase/supabase-js';

export const admin = createClient<Database>(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);