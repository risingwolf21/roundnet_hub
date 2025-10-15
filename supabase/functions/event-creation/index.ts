// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
import * as Sentry from 'https://deno.land/x/sentry/index.mjs';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { format } from 'https://esm.sh/date-fns';


Sentry.init({
  dsn: 'https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536',
  defaultIntegrations: false,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0
});

Deno.serve(async (req: Request) => {
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: created_events, error } = await supabaseClient
      .rpc('create_next_occurrences', {
        p_run_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"),
        p_horizon: '2 months',
      })
      .throwOnError();

    if (error) {
      throw error;
    }

    for (const event of created_events) {
      Sentry.logger.info('event_created', {
        ...event,
        origin: 'edge_function'
      })
    }

    // Return the response with the correct content type header
    return new Response({
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    return new Response(JSON.stringify(error), { status: 500 });
  }
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer REMOVED_KEY' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
