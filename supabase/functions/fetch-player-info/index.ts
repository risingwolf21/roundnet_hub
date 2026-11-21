import * as Sentry from 'sentry';
import { parseProfile, playerIdFromRgId, PLAYERZONE } from './parse.ts';
import { withSentry } from '../_shared/sentry.ts';
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

class ProfileParseError extends Error {
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


Deno.serve(withSentry(Sentry, async (req) => {
  const payload = await req.json();
  try {
    const { rg_id, player } = payload;

    if (!rg_id) {
      return new Response(JSON.stringify({ error: 'rg_id ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // RG ID → numeric player id. The URL is always built here, never taken from the input.
    const playerId = playerIdFromRgId(rg_id);
    if (!playerId) {
      Sentry.captureMessage(`fetch-player-info: not an RG ID: ${rg_id}`, 'warning');
      return new Response(JSON.stringify({ error: 'Keine gültige RG-ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const response = await fetch(`${PLAYERZONE}/players/${playerId}`);
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
    const profile = parseProfile(await response.text());
    if (!profile) {
      // Playerzone changed its layout: keep what is stored instead of writing blanks or 0.
      Sentry.captureException(new ProfileParseError(`No player profile found on ${PLAYERZONE}/players/${playerId}`));
      return new Response(JSON.stringify({ error: 'Playerzone-Profil konnte nicht gelesen werden' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (profile.rgIndex === null) {
      Sentry.captureMessage(`fetch-player-info: no RG-Index on player ${playerId}`, 'warning');
    }

    // rg_id is the user's input and is not written here, so this update does not fire the rg_id trigger again.
    const { error } = await supabase
      .schema('games')
      .from('players')
      .update({
        rg_index: profile.rgIndex,
        rg_avatar_url: profile.avatarUrl,
      })
      .eq('player', player);

    if (error) throw error;

    return new Response('Successfully updated user with index ' + profile.rgIndex, {
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
}));
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/fetch-player-info' \
    --header 'Authorization: Bearer REMOVED_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
