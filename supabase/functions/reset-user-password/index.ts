// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  // Im Dev: '*' oder 'http://localhost:5173'
  // Im Prod: konkret deine Domain(en) eintragen
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  // 1) Preflight beantworten
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response('Missing bearer token', { status: 401 });
    }

    const { userId, newPassword } = await req.json();
    if (!userId || typeof newPassword !== 'string' || newPassword.length < 12) {
      return new Response('Invalid payload', { status: 400 });
    }

    // 1) Client-ähnlicher Supabase-Client, um den aufrufenden User aus dem JWT zu lesen
    const supabase = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: me, error: meErr } = await supabase.auth.getUser();
    if (meErr || !me?.user) return new Response('Unauthorized', { status: 401 });

    // 2) Admin-Check gegen eure public.user-Tabelle (Role-Feld)
    const { data: adminRow, error: adminErr } = await supabase
      .from('user')
      .select('role')
      .eq('userId', me.user.id)
      .single();

    if (adminErr || adminRow?.role !== 'admin') {
      return new Response('Forbidden. User does not have the admin role.', { status: 403 });
    }

    const { data: permissions, error: permissionErr } = await supabase
      .from('user_permissions')
      .select('permission');

    if (permissionErr || permissions.map((x: any) => x.permission).includes('reset_user_password')) {
      return new Response('Forbidden. "reset_user_password" Permission is missing.', { status: 403 });
    }

    // 3) Admin-Client mit Service Role für Passwort-Update
    const admin = createClient(url, serviceKey);
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updErr) return new Response(updErr.message, { status: 400 });

    // Optional: Sessions des Zielnutzers invalidieren (Logout überall) – je nach Policy.

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(`Server error: ${String(e)}`, { status: 500 });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/reset-user-password' \
    --header 'Authorization: Bearer REMOVED_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
