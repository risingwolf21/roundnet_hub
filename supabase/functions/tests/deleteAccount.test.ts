// Integration test for the delete-account edge function.
// Requires the local stack (`supabase start`) incl. edge runtime. Run via `yarn test:functions`.
import { assertEquals } from '@std/assert';
import { createClient } from 'supabase';

const API_URL = Deno.env.get('API_URL') ?? Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const configured = Boolean(API_URL && ANON_KEY && SERVICE_ROLE_KEY);

const PASSWORD = 'initial-password-123';
const run = crypto.randomUUID().slice(0, 8);

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

const callDelete = (token: string | null, body: unknown) =>
  fetch(`${API_URL}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY!,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

Deno.test({
  name: 'delete-account',
  ignore: !configured,
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    const service = createClient(API_URL!, SERVICE_ROLE_KEY!, clientOptions);
    const anon = createClient(API_URL!, ANON_KEY!, clientOptions);

    const email = `edge-delete-${run}@example.com`;
    const { data: created, error } = await service.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !created.user) throw error ?? new Error('createUser failed');
    const userId = created.user.id;
    const { data: session } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
    const token = session.session!.access_token;

    try {
      await t.step('rejects calls without a user session', async () => {
        const res = await callDelete(null, { password: PASSWORD });
        await res.body?.cancel();
        assertEquals(res.status, 401);
      });

      await t.step('rejects the anon key', async () => {
        const res = await callDelete(ANON_KEY!, { password: PASSWORD });
        await res.body?.cancel();
        assertEquals(res.status, 401);
      });

      await t.step('requires a password', async () => {
        const res = await callDelete(token, {});
        await res.body?.cancel();
        assertEquals(res.status, 400);
      });

      await t.step('rejects a wrong password and keeps the account', async () => {
        const res = await callDelete(token, { password: 'not-the-password' });
        await res.body?.cancel();
        assertEquals(res.status, 403);
        const { data } = await service.from('user').select('disabled').eq('id', userId).single();
        assertEquals(data?.disabled, false);
      });

      await t.step('anonymizes the profile and blocks future logins', async () => {
        const res = await callDelete(token, { password: PASSWORD });
        assertEquals(res.status, 200);
        await res.body?.cancel();

        const { data } = await service.from('user').select('name, email, disabled').eq('id', userId).single();
        assertEquals(data?.disabled, true);
        assertEquals(data?.name, 'Gelöschter Nutzer');
        assertEquals(data?.email, `deleted-${userId}@deleted.invalid`);

        const login = await createClient(API_URL!, ANON_KEY!, clientOptions).auth.signInWithPassword({
          email,
          password: PASSWORD,
        });
        assertEquals(login.data.session, null);
      });

      await t.step('can be repeated without error', async () => {
        const res = await callDelete(token, { password: PASSWORD });
        await res.body?.cancel();
        // the session is gone by now, so this must be refused rather than crash
        assertEquals([401, 403].includes(res.status), true, `status ${res.status}`);
      });
    } finally {
      await service.auth.admin.deleteUser(userId).catch(() => {});
    }
  },
});
