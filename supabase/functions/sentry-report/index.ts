// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as Sentry from 'sentry';
import { Json } from "../_shared/supabase-generated.types.ts";

Sentry.init({
  dsn: 'https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536',
  defaultIntegrations: false,
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
});

Sentry.setTag('region', Deno.env.get('SB_REGION'))
Sentry.setTag('execution_id', Deno.env.get('SB_EXECUTION_ID'))


interface BackgroundErrorRow {
  id: number;
  at: string;                 // timestamptz
  source: string;
  op: string;
  ref_id: string | null;      // uuid
  message: string | null;
  details: Json | null; // enthält u.a. table/op/row/claims (je nach Logger)
  reported?: boolean;
  actor_user?: string | null; // uuid
}

function asIso(s: string) {
  try { return new Date(s).toISOString(); } catch { return new Date().toISOString(); }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {

    const row = (await req.json()) as BackgroundErrorRow;

    await Sentry.withScope(async (scope) => {
      if (row.actor_user) scope.setUser({ id: row.actor_user });

      scope.setTag("source", row.source);
      scope.setTag("op", row.op);

      scope.setExtras({
        background_error_id: row.id,
        ref_id: row.ref_id ?? null,
        at: row.at,
        details: row.details ?? null,
      });

      scope.setFingerprint([row.source, row.op]);

      Sentry.captureEvent({
        level: "error",
        timestamp: Date.parse(asIso(row.at)) / 1000,
        logger: "db.trigger.util.background_errors",
        platform: "other",
        message: `${row.source}/${row.op}: ${row.message ?? "(no message)"}`,
      });
    })


    return new Response("ok", { status: 200 });
  } catch (e) {
    // Bei Handler-Fehlern: ebenfalls an Sentry senden
    Sentry.captureException(e);
    await Sentry.flush(2000);
    return new Response(`handler error: ${e}`, { status: 500 });
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sentry-report' \
    --header 'Authorization: Bearer REMOVED_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
