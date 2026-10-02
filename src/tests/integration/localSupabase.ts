// Helpers for integration tests that run against the local Supabase stack (`supabase start`).
import { Database } from '@/types/supabase-generated.types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('test', 'environments', '');

export const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const isLocal = !!SUPABASE_URL && /localhost|127\.0\.0\.1/.test(SUPABASE_URL);

/** Integration tests only run against a local stack, never against staging / production. */
export const hasLocalSupabase = isLocal && !!ANON_KEY && !!SERVICE_ROLE_KEY;

const options = { auth: { persistSession: false, autoRefreshToken: false } };

export const adminClient = (): SupabaseClient<Database> => createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, options);
export const anonClient = (): SupabaseClient<Database> => createClient<Database>(SUPABASE_URL, ANON_KEY, options);

export async function signUpNewUser() {
  const client = anonClient();
  const email = `vitest-${crypto.randomUUID()}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: '123123123' });
  if (error || !data.user || !data.session) throw error ?? new Error('sign up did not return a session');
  return { client, user: data.user, email };
}

/** public.user / games.players reference auth.users without ON DELETE CASCADE. */
export async function deleteUser(userId: string) {
  const admin = adminClient();
  await admin.from('group_user_mapping').delete().eq('user', userId);
  await admin.schema('games').from('players').delete().or(`linked_user_id.eq.${userId},player.eq.${userId}`);
  await admin.from('user').delete().eq('id', userId);
  await admin.auth.admin.deleteUser(userId);
}
