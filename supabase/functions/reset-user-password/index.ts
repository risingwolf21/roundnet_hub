import * as Sentry from 'sentry';
import { createClient } from 'supabase';
import { Database, Tables } from '../_shared/supabase-generated.types.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
      return new Response('Das Passwort muss mindestens 6 Zeichen enthalten', { status: 400, headers: corsHeaders });
    }

    // 1) Client-ähnlicher Supabase-Client, um den aufrufenden User aus dem JWT zu lesen
    const { data: me, error: meErr } = await supabase.auth.getUser(token);
    if (meErr || !me?.user) {
      throw meErr
    }

    // 2) Admin-Check gegen eure public.user-Tabelle (Role-Feld)
    const { data: adminRow, error: adminErr } = await supabase
      .from('user')
      .select('role')
      .eq('userId', me.user.id)
      .single();

    if (adminErr || adminRow?.role !== 'admin') {
      throw adminErr;
    }

    const { data: permissions, error: permissionErr } = await supabase
      .from("user_grants_view")
      .select("*");

    if (permissionErr || permissions.map((x: Tables<'user_grants_view'>) => x.key).includes('reset_user_password')) {
      throw new UnauthorizedError(JSON.stringify({
        user_email: me.user.email,
        user_id: me.user.id,
        for_user_id: userId
      }))
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