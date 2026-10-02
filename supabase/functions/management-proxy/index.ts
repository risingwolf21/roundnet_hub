import { createClient } from "supabase";
import { Database } from "../_shared/supabase-generated.types.ts";
import { buildAllowedRoutes, isAllowedRoute, projectRefFromUrl } from "../_shared/managementProxyRoutes.ts";

const corsHeaders = {
  // Im Dev: '*' oder 'http://localhost:5173'
  // Im Prod: konkret deine Domain(en) eintragen
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const PROJECT_REF = Deno.env.get("SUPABASE_PROJECT_REF") ?? projectRefFromUrl(SUPABASE_URL);
const ALLOWED_ROUTES = buildAllowedRoutes(PROJECT_REF);

const jsonError = (message: string, status: number) =>
  new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return new Response('Missing bearer token', { status: 401, headers: corsHeaders });
    }

    // Client acting as the caller, so auth.uid() / RLS / authorize() apply.
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return jsonError('Unauthorized: You must be logged in.', 401)
    }

    const { data: isAdmin, error: authzError } = await supabase.rpc('authorize', { requested_permission: 'supabase.admin' })
    if (authzError || isAdmin !== true) {
      return jsonError('Forbidden: Only Admins can access the Management API.', 403)
    }

    const { path, method, payload } = await req.json()

    if (typeof path !== 'string' || typeof method !== 'string') {
      throw new Error('Missing required parameters: path and method')
    }

    const upperMethod = method.toUpperCase()
    if (!isAllowedRoute(ALLOWED_ROUTES, upperMethod, path)) {
      return jsonError(`Forbidden: ${upperMethod} ${path} is not allowed through this proxy.`, 403)
    }

    // 4. Retrieve the secure Personal Access Token
    const PAT = Deno.env.get('PAT')
    if (!PAT) {
      throw new Error('PAT is not configured in Edge Function secrets.')
    }

    // 5. Forward the request to the Management API
    const managementApiUrl = `https://api.supabase.com${path}`
    const response = await fetch(managementApiUrl, {
      method: upperMethod,
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json'
      },
      body: payload ? JSON.stringify(payload) : undefined
    })

    // 6. Handle the response
    const responseText = await response.text()
    let data
    try {
      data = JSON.parse(responseText) // Try parsing as JSON
    } catch {
      data = responseText // Fallback to plain text if empty (e.g., 204 No Content)
    }

    if (!response.ok) {
      throw new Error(`Management API Error (${response.status}): ${responseText}`)
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})