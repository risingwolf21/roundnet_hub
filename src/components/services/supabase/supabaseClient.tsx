import { createClient } from '@supabase/supabase-js'
import { Database } from 'src/types/supabase';

const supabaseUrl = process.env.REACT_APP_supabaseUrl;
const supabaseAnonKey = process.env.REACT_APP_supabaseAnonKey;
const supabaseAdminKey = process.env.REACT_APP_supabaseAdminKey;

export const supabase = createClient<Database>(supabaseUrl ?? "", supabaseAnonKey ?? "");

export const supabaseAdmin = createClient<Database>(supabaseUrl ?? "", supabaseAdminKey ?? "");