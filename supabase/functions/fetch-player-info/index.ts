// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Importiere benötigte Module
import { createClient } from 'npm:@supabase/supabase-js@2';
import cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';
import * as Sentry from 'https://deno.land/x/sentry/index.mjs';

Sentry.init({
  dsn: 'https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536',
  integrations: [],
  // Performance Monitoring
  tracesSampleRate: 1.0,
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
});

class UpdatePlayerError extends Error {
  constructor(msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, UpdatePlayerError.prototype);
  }
}

Deno.serve(async (req) => {
  const payload = await req.json();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    global: {
      headers: {
        app_version: '1.6.0',
      },
    },
  });
  try {
    // Beispiel: Hole den "rg_link" aus der Anfrage

    const { rg_link, player } = payload;

    if (!rg_link) {
      await supabase.schema("logs").from("player_info").insert({ type: "error", content: JSON.stringify({ payload, message: "rg_link ist erforderlich" }) });
      return new Response(JSON.stringify({ error: 'rg_link ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // HTML von der angegebenen URL abrufen
    const response = await fetch(rg_link);
    if (!response.ok) {
      await supabase.schema("logs").from("player_info").insert({ type: "error", content: JSON.stringify({ response, message: "Fehler beim Abrufden der URL" }) });
      return new Response(JSON.stringify({ error: 'Fehler beim Abrufen der URL' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const html = await response.text();

    // HTML mit Cheerio analysieren
    const $ = cheerio.load(html);


    const avatar_url = $(".player-card").find('.player-img').attr('src');

    // Element mit der Klasse "rgx-value" abrufen
    const rgxValue = $('.player-card').find('.rgx-value').text();
    const idParts = rg_link.split("/").slice(-1)[0].split("-");
    const rgId = idParts[1].slice(0,3).toUpperCase() + idParts[0];

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

    if (error) console.error(error);

    await supabase.schema("logs").from("player_info").insert({ type: "success", content: JSON.stringify({ payload, rgxValue, message: "Successfully updated user with index" }) });
    // Antwort mit dem extrahierten Wert zurückgeben
    return new Response('Successfully updated user with index ' + rgxValue, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    await supabase.schema("logs").from("player_info").insert({ type: "error", content: JSON.stringify({ payload, error }) });
    console.error(error);
    Sentry.captureException(
      new UpdatePlayerError(
        JSON.stringify({
          error,
          payload,
        })
      )
    );
    return new Response(JSON.stringify({ error: 'Interner Serverfehler', details: error.message }), {
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
