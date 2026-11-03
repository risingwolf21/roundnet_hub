import * as Sentry from 'sentry';
import { createClient } from 'supabase';
import { localized } from '../_shared/lang.ts';
import { Database } from '../_shared/supabase-generated.types.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

Sentry.init({
  dsn: 'https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536',
  defaultIntegrations: false,
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
  integrations: [Sentry.supabaseIntegration({ supabaseClient: supabase })],
});

Sentry.setTag('region', Deno.env.get('SB_REGION'))
Sentry.setTag('execution_id', Deno.env.get('SB_EXECUTION_ID'))

const corsHeaders = {
  // Im Dev: '*' oder 'http://localhost:5173'
  // Im Prod: konkret deine Domain(en) eintragen
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

class UnauthorizedError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

Deno.serve(async (req) => {
  // 1) Preflight beantworten
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return new Response('Missing bearer token', { status: 401, headers: corsHeaders });
    }

    const { userId, newPassword } = await req.json();
    if (!userId || typeof newPassword !== 'string') {
      return new Response('Invalid payload', { status: 400, headers: corsHeaders });
    }
    if (newPassword.length < 6) {
      return new Response(localized(req, 'Das Passwort muss mindestens 6 Zeichen enthalten', 'The password must be at least 6 characters long'), { status: 400, headers: corsHeaders });
    }

    // 1) Client acting as the caller, so auth.uid() / authorize() refer to them
    const callerClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: me, error: meErr } = await callerClient.auth.getUser(token);
    if (meErr || !me?.user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // 2) Permission check via the grants system (group or direct grant)
    const [{ data: canReset, error: resetErr }, { data: isAdmin, error: adminErr }] = await Promise.all([
      callerClient.rpc('authorize', { requested_permission: 'reset_user_password' }),
      callerClient.rpc('authorize', { requested_permission: 'supabase.admin' }),
    ]);

    if (resetErr || adminErr || (canReset !== true && isAdmin !== true)) {
      Sentry.captureException(new UnauthorizedError(JSON.stringify({
        user_id: me.user.id,
        for_user_id: userId,
      })));
      return new Response(JSON.stringify({ error: localized(req, 'Keine Berechtigung', 'Forbidden') }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3) Admin-Client mit Service Role für Passwort-Update
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updErr) throw updErr;

    // Optional: Sessions des Zielnutzers invalidieren (Logout überall) – je nach Policy.

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    Sentry.captureException(new UnauthorizedError(JSON.stringify(e)))
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});