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
  const { data, error } = await supabase.functions.invoke('management-proxy', {
    body: {
      path,
      method,
      payload,
    },
  });

  if (error) {
    console.error(`[Management API] Failed calling ${method} ${path}`, error);
    throw new Error(error.message || 'Failed to call Management API');
  }

  return data;
}
