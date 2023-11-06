import { createClient } from '@supabase/supabase-js'
import { Database } from 'src/types/supabase';

const supabaseUrl = process.env.REACT_APP_supabaseUrl;
const supabaseAnonKey = process.env.REACT_APP_supabaseAnonKey;

export const supabase = createClient<Database>(supabaseUrl ?? "", supabaseAnonKey ?? "")