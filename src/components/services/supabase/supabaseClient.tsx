import {createClient} from '@supabase/supabase-js'
import {Database} from "../../../types/supabase-generated.types";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabaseAdminKey = process.env.REACT_APP_SUPABASE_ADMIN_KEY;

export const supabase = createClient<Database>(supabaseUrl ?? "", supabaseAnonKey ?? "");

export const supabaseAdmin = createClient<Database>(supabaseUrl ?? "", supabaseAdminKey ?? "");