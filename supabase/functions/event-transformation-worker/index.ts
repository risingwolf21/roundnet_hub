/// <reference lib="deno.ns" />

import { createClient } from 'supabase';
import * as Sentry from 'sentry';
import { Database } from '../_shared/supabase-generated.types.ts';

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

function intervalToMs(interval: string): number {
  if (interval.includes("day")) {
    const days = parseInt(interval);
    return days * 24 * 60 * 60 * 1000;
  }

  const [h, m, s] = interval.split(":").map(Number);
  return ((h * 60 + m) * 60 + s) * 1000;
}

type EventTransformationTrigger = {
  attending_lt?: number;
  force_key_change?: boolean;
};

Deno.serve(async (req) => {
  let appliedCount = 0;
  try {
    const { data: transformations, error: trError } = await supabase
      .from('event_transformations')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (trError) {
      Sentry.captureException(trError);
      return new Response('Error fetching transformations', { status: 500 });
    }

    for (const transformation of transformations) {
      const { data: events, error: evError } = await supabase
        .from("events")
        .select("*")
        .eq("key", transformation.event_key)
        .gte(
          "startingDateTime",
          new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        )
        .lte(
          "startingDateTime",
          new Date(Date.now() + intervalToMs(transformation.lead_time as string)).toISOString()
        );

      if (evError) {
        Sentry.captureException(evError);
        continue;
      }

      for (const e of events ?? []) {
        try {
          // 3️⃣ skip if already applied
          const { count } = await supabase
            .from("event_transformation_applications")
            .select("*", { count: "exact", head: true })
            .eq("transformation_id", transformation.id)
            .eq("event_id", e.id);

          if ((count ?? 0) > 0) continue;

          const trigger = transformation.trigger as EventTransformationTrigger | null;

          // 4️⃣ trigger: attending_lt
          if (trigger?.attending_lt !== undefined) {
            const { count: attendingCount } = await supabase
              .from("event_attendance_user_mapping")
              .select("*", { count: "exact", head: true })
              .eq("event", e.id)
              .eq("state", "Attending");

            if ((attendingCount ?? 0) >= trigger.attending_lt) {
              continue;
            }
          }

          // 5️⃣ apply transformation
          const { error: applyError } = await supabase.rpc(
            "apply_transformation_to_event",
            {
              p_transformation_id: transformation.id,
              p_event_id: e.id,
            }
          );

          if (applyError) {
            Sentry.captureException(applyError);
            continue;
          }

          appliedCount++;
        } catch (error) {
          Sentry.captureException(error);
          continue;
        }
      }
    }
    return Response.json({ appliedCount });
  } catch (error) {
    Sentry.captureException(error);
    return new Response('Error processing transformations', { status: 500 });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/event-transformation-worker' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
