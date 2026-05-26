import { createClient } from "supabase";
import { Database } from "../_shared/supabase-generated.types.ts";

const corsHeaders = {
  // Im Dev: '*' oder 'http://localhost:5173'
  // Im Prod: konkret deine Domain(en) eintragen
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
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

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized: You must be logged in.')
    }

    const { data: profile } = await supabase.from('user').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('Forbidden: Only Admins can access the Management API.')

    const { path, method, payload } = await req.json()

    if (!path || !method) {
      throw new Error('Missing required parameters: path and method')
    }

    // 4. Retrieve the secure Personal Access Token
    const PAT = Deno.env.get('PAT')
    if (!PAT) {
      throw new Error('PAT is not configured in Edge Function secrets.')
    }

    // 5. Forward the request to the Management API
    const managementApiUrl = `https://api.supabase.com${path}`
    const response = await fetch(managementApiUrl, {
      method: method.toUpperCase(),
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