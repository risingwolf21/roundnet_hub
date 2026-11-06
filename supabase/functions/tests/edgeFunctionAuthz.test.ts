// Integration tests for the authorization of admin edge functions.
// Requires the local stack (`supabase start`) incl. edge runtime. Run via `yarn test:functions`.
import { assert, assertEquals } from '@std/assert';
import { createClient, SupabaseClient } from 'supabase';

const API_URL = Deno.env.get('API_URL') ?? Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const configured = Boolean(API_URL && ANON_KEY && SERVICE_ROLE_KEY);

const PASSWORD = 'initial-password-123';
const run = crypto.randomUUID().slice(0, 8);

type TestUser = { id: string; email: string; token: string };

const service = configured
  ? createClient(API_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  : (null as unknown as SupabaseClient);

const anonClient = () =>
  createClient(API_URL!, ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

const created: TestUser[] = [];

async function createUser(name: string, perms: string[] = []): Promise<TestUser> {
  const email = `edge-${name}-${run}@example.com`;
  const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error || !data.user) throw error ?? new Error('createUser failed');
  for (const key of perms) {
    const { error: grantError } = await service
      .from('user_direct_grants')
      .insert({ user: data.user.id, kind: 'perm', key });
    if (grantError) throw grantError;
  }
  const token = await signIn(email, PASSWORD);
  if (!token) throw new Error(`sign in failed for ${email}`);
  const user = { id: data.user.id, email, token };
  created.push(user);
  return user;
}

async function signIn(email: string, password: string) {
  const { data } = await anonClient().auth.signInWithPassword({ email, password });
  return data.session?.access_token ?? null;
}

function callFunction(name: string, init: { method?: string; token?: string | null; body?: unknown }) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: ANON_KEY! };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  return fetch(`${API_URL}/functions/v1/${name}`, {
    method: init.method ?? 'POST',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

Deno.test({
  name: 'edge function authorization',
  ignore: !configured,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    const normal = await createUser('normal');
    const admin = await createUser('admin', ['supabase.admin']);
    const resetter = await createUser('resetter', ['reset_user_password']);
    const target = await createUser('target');

    try {
      await t.step('reset-user-password: only POST is accepted', async () => {
        const res = await callFunction('reset-user-password', { method: 'GET', token: admin.token });
        await res.body?.cancel();
        assertEquals(res.status, 405);
      });

      await t.step('reset-user-password: rejects calls without a bearer token', async () => {
        const res = await fetch(`${API_URL}/functions/v1/reset-user-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY! },
          body: JSON.stringify({ userId: target.id, newPassword: 'whatever-123' }),
        });
        await res.body?.cancel();
        assert([401].includes(res.status), `status ${res.status}`);
      });

      await t.step('reset-user-password: rejects anon key and too short passwords', async () => {
        const anon = await callFunction('reset-user-password', {
          token: ANON_KEY,
          body: { userId: target.id, newPassword: 'whatever-123' },
        });
        await anon.body?.cancel();
        assertEquals(anon.status, 401);

        const short = await callFunction('reset-user-password', {
          token: admin.token,
          body: { userId: target.id, newPassword: '123' },
        });
        await short.body?.cancel();
        assertEquals(short.status, 400);
      });

      await t.step('reset-user-password: normal users cannot reset passwords', async () => {
        const res = await callFunction('reset-user-password', {
          token: normal.token,
          body: { userId: target.id, newPassword: 'hijacked-password-1' },
        });
        assertEquals(res.status, 403);
        await res.body?.cancel();
        assert(await signIn(target.email, PASSWORD), 'old password still works');
        assertEquals(await signIn(target.email, 'hijacked-password-1'), null);
      });

      await t.step('reset-user-password: users with reset_user_password can reset', async () => {
        const res = await callFunction('reset-user-password', {
          token: resetter.token,
          body: { userId: target.id, newPassword: 'reset-by-grant-1' },
        });
        assertEquals(res.status, 200);
        assertEquals(await res.json(), { ok: true });
        assert(await signIn(target.email, 'reset-by-grant-1'));
      });

      await t.step('reset-user-password: supabase.admin can reset', async () => {
        const res = await callFunction('reset-user-password', {
          token: admin.token,
          body: { userId: target.id, newPassword: 'reset-by-admin-1' },
        });
        assertEquals(res.status, 200);
        await res.body?.cancel();
        assert(await signIn(target.email, 'reset-by-admin-1'));
      });
    } finally {
      for (const user of created) {
        // public.user / games.players reference auth.users without ON DELETE CASCADE
        await service.from('user_direct_grants').delete().eq('user', user.id);
        await service.schema('games').from('players').delete().or(`linked_user_id.eq.${user.id},player.eq.${user.id}`);
        await service.from('user').delete().eq('id', user.id);
        const { error } = await service.auth.admin.deleteUser(user.id);
        if (error) console.warn(`cleanup of ${user.email} failed: ${error.message}`);
      }
    }
  },
});
