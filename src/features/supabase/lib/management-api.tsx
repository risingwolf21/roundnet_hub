import { supabase } from "@/lib/supabase";

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * A strongly-typed wrapper for the Universal Management API Proxy Edge Function.
 * It uses the OpenAPI schema to ensure you pass valid paths and payloads.
 */
export async function invokeManagementApi<
  Method extends HttpMethod
>(
  path: string, // We use string here because OpenAPI paths have variables like {ref} that you need to replace
  method: Method,
  payload?: any // You can narrow this type further using the schema if needed
) {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  if (!accessToken) throw new Error('Not authenticated');

  const resp = await fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/management-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      path,
      method,
      payload,
    }),
  })
  if (!resp.ok) {
    const error = await resp.text();
    console.error(`[Management API] Failed calling ${method} ${path}`, error);
    throw new Error(error || 'Failed to call Management API');
  }
  const result = await resp.json();

  return {
    data: result,
    error: null
  };
}
