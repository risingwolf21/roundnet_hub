import { load } from 'cheerio';
import * as Sentry from 'sentry';
import { createClient } from 'supabase';
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

class UpdatePlayerError extends Error {
  constructor(msg: string) {
    super(msg);

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class RgUrlFetchError extends Error {

  body: string;
  status: number;
  statusText: string;
  message: string;

  constructor(message: string, body: string, status: number, statusText: string) {
    super(message);
    this.message = message;
    this.body = body;
    this.status = status;
    this.statusText = statusText;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}


Deno.serve(async (req) => {
  const payload = await req.json();
  try {
    const { rg_link, player } = payload;

    if (!rg_link) {
      return new Response(JSON.stringify({ error: 'rg_link ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // HTML von der angegebenen URL abrufen
    const response = await fetch(rg_link);
    if (!response.ok) {
      const body = await response.text();
      const error = new RgUrlFetchError("Could not fetch playerzone profile", body, response.status, response.statusText);

      Sentry.captureException(error);

      return new Response(JSON.stringify(error), {
        status: response.status,
        statusText: response.statusText,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const html = await response.text();

    // HTML mit Cheerio analysieren
    const $ = load(html);

    const avatar_url = $(".player-card").find('.player-img').attr('src');

    // Element mit der Klasse "rgx-value" abrufen
    const rgxValue = $('.player-card').find('.rgx-value').text();
    const idParts = rg_link.split("/").slice(-1)[0].split("-");
    const rgId = idParts[1].slice(0, 3).toUpperCase() + idParts[0];

    const { error } = await supabase
      .schema('games')
      .from('players')
      .update({
        rg_id: rgId,
        rg_index: Number(rgxValue),
        rg_avatar_url: avatar_url
      })
      .eq('player', player);

    if (error) throw error;

    return new Response('Successfully updated user with index ' + rgxValue, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    Sentry.captureException(
      new UpdatePlayerError(
        JSON.stringify({
          error,
          payload,
        })
      )
    );
    return new Response(JSON.stringify({ error: 'Interner Serverfehler', details: JSON.stringify(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/fetch-player-info' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
