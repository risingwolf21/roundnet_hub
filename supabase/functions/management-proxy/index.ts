import { createClient } from "supabase";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. SECURITY GATE: Verify the user calling this function
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized: You must be logged in.')
    }

    // TODO: ADD YOUR ADMIN CHECK HERE! 
    const { data: profile } = await supabaseClient.from('user').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('Forbidden: Only Admins can access the Management API.')

    // 3. Parse the intended Management API request from the frontend payload
    const { path, method, payload } = await req.json()

    if (!path || !method) {
      throw new Error('Missing required parameters: path and method')
    }

    // 4. Retrieve the secure Personal Access Token
    const PAT = Deno.env.get('SUPABASE_PAT')
    if (!PAT) {
      throw new Error('SUPABASE_PAT is not configured in Edge Function secrets.')
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