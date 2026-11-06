import * as Sentry from 'sentry';
import { createClient } from 'supabase';
import { localized } from '../_shared/lang.ts';
import { Database } from '../_shared/supabase-generated.types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

Sentry.init({
  dsn: 'https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536',
  defaultIntegrations: false,
  tracesSampleRate: 1.0,
});

Sentry.setTag('region', Deno.env.get('SB_REGION'));
Sentry.setTag('execution_id', Deno.env.get('SB_EXECUTION_ID'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept-language',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const AVATAR_BUCKET = 'user';

async function removeAvatars(userId: string) {
  const bucket = admin.storage.from(AVATAR_BUCKET);
  const { data: files, error } = await bucket.list(userId, { limit: 1000 });
  if (error) throw error;
  if (files && files.length > 0) {
    const { error: rmErr } = await bucket.remove(files.map((f) => `${userId}/${f.name}`));
    if (rmErr) throw rmErr;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return json({ error: 'Missing bearer token' }, 401);
    }

    const { password } = await req.json().catch(() => ({}));
    if (typeof password !== 'string' || password.length === 0) {
      return json({ error: localized(req, 'Passwort erforderlich', 'Password required') }, 400);
    }

    const anon = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: me, error: meErr } = await anon.auth.getUser(token);
    if (meErr || !me?.user?.email) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = me.user.id;

    // Re-authenticate so a stolen session alone cannot delete the account.
    const { error: pwErr } = await anon.auth.signInWithPassword({ email: me.user.email, password });
    if (pwErr) {
      return json({ error: localized(req, 'Das Passwort ist falsch', 'The password is incorrect') }, 403);
    }

    // Every step is idempotent, so a failed attempt can simply be retried.
    await removeAvatars(userId);

    const { error: anonErr } = await admin.rpc('anonymize_user', { p_user_id: userId });
    if (anonErr) throw anonErr;

    const { error: delErr } = await admin.auth.admin.deleteUser(userId, true);
    if (delErr) throw delErr;

    return json({ ok: true });
  } catch (e) {
    Sentry.captureException(e);
    return json({ error: localized(req, 'Das Konto konnte nicht gelöscht werden', 'The account could not be deleted') }, 500);
  }
});
