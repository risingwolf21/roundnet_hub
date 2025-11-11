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

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, UpdatePlayerError.prototype);
  }
}

class RgLinkMissingError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, RgLinkMissingError.prototype);
  }
}

class RgUrlFetchError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, RgUrlFetchError.prototype);
  }
}

Deno.serve(async (req) => {
  const payload = await req.json();
  try {
    const { rg_link, player } = payload;

    if (!rg_link) {
      Sentry.captureException(new RgLinkMissingError(JSON.stringify(payload)))
      return new Response(JSON.stringify({ error: 'rg_link ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // HTML von der angegebenen URL abrufen
    const response = await fetch(rg_link);
    if (!response.ok) {
      Sentry.captureException(new RgUrlFetchError(JSON.stringify({ rg_link, ...response })));
      return new Response(JSON.stringify({ error: 'Fehler beim Abrufen der URL' }), {
        status: response.status,
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

    console.log(rg_link, rgxValue, rgId);

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
    console.error(error);
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
    --header 'Authorization: Bearer REMOVED_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
