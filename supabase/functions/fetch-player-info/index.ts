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


const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Refresh-all mode: players per call and pause between playerzone requests (to be gentle on playerzone).
const BATCH_SIZE = 20;
const PAUSE_MS = 250;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });

// Why one player could not be refreshed; the admin screen translates these.
type FailReason = 'invalid_rg_id' | 'not_found' | 'fetch_failed' | 'unreadable' | 'internal';

type RefreshResult =
  | { ok: true; rgIndex: number | null }
  | { ok: false; status: number; reason: string; code: FailReason };

/** Loads one player's playerzone profile and stores RG-Index, avatar and Pro status. */
async function refreshPlayer(player: string, rgId: string): Promise<RefreshResult> {
  // RG ID → numeric player id. The URL is always built here, never taken from the input.
  const playerId = playerIdFromRgId(rgId);
  if (!playerId) {
    Sentry.captureMessage(`fetch-player-info: not an RG ID: ${rgId}`, 'warning');
    return { ok: false, status: 400, reason: 'Keine gültige RG-ID', code: 'invalid_rg_id' };
  }
  const response = await fetch(`${PLAYERZONE}/players/${playerId}`);
  if (!response.ok) {
    const body = await response.text();
    Sentry.captureException(new RgUrlFetchError("Could not fetch playerzone profile", body, response.status, response.statusText));
    return {
      ok: false,
      status: response.status,
      reason: `Playerzone antwortet mit ${response.status}`,
      code: response.status === 404 ? 'not_found' : 'fetch_failed',
    };
  }
  const profile = parseProfile(await response.text());
  if (!profile) {
    // Playerzone changed its layout: keep what is stored instead of writing blanks or 0.
    Sentry.captureException(new ProfileParseError(`No player profile found on ${PLAYERZONE}/players/${playerId}`));
    return { ok: false, status: 502, reason: 'Playerzone-Profil konnte nicht gelesen werden', code: 'unreadable' };
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
      pro_status: profile.pro,
    })
    .eq('player', player);
  if (error) throw error;

  return { ok: true, rgIndex: profile.rgIndex };
}

/** Refresh-all needs `playerzone.refresh` (or `supabase.admin`), checked with the caller's own JWT. */
async function canRefreshAll(authHeader: string): Promise<boolean> {
  const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const [a, b] = await Promise.all([
    caller.rpc('authorize', { requested_permission: 'playerzone.refresh' }),
    caller.rpc('authorize', { requested_permission: 'supabase.admin' }),
  ]);
  return a.data === true || b.data === true;
}

/** One batch of the admin's "reload everyone": the client calls again with `next` until it is null. */
async function refreshBatch(offset: number) {
  const { data, count, error } = await supabase
    .schema('games')
    .from('players')
    .select('player, rg_id, display_name', { count: 'exact' })
    .not('rg_id', 'is', null)
    .order('player')
    .range(offset, offset + BATCH_SIZE - 1);
  if (error) throw error;

  const rows = data ?? [];
  let updated = 0;
  let unrated = 0;
  const failed: { rg_id: string; name: string | null; reason: FailReason }[] = [];
  for (const [i, row] of rows.entries()) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
    try {
      const result = await refreshPlayer(row.player, row.rg_id!);
      if (result.ok) {
        updated++;
        if (result.rgIndex === null) unrated++;
      } else {
        failed.push({ rg_id: row.rg_id!, name: row.display_name, reason: result.code });
      }
    } catch (error) {
      Sentry.captureException(error);
      failed.push({ rg_id: row.rg_id!, name: row.display_name, reason: 'internal' });
    }
  }

  const total = count ?? 0;
  const processed = offset + rows.length;
  return { total, processed, updated, unrated, failed, next: rows.length > 0 && processed < total ? processed : null };
}

Deno.serve(withSentry(Sentry, async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const payload = await req.json();
  try {
    if (payload.all === true) {
      if (!(await canRefreshAll(req.headers.get('Authorization') ?? ''))) {
        return json({ error: 'Keine Berechtigung (playerzone.refresh)' }, 403);
      }
      const offset = Number.isInteger(payload.offset) && payload.offset >= 0 ? payload.offset : 0;
      return json(await refreshBatch(offset));
    }

    // Single player, called by the rg_id trigger.
    const { rg_id, player } = payload;
    if (!rg_id) {
      return new Response(JSON.stringify({ error: 'rg_id ist erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const result = await refreshPlayer(player, rg_id);
    if (!result.ok) {
      return new Response(JSON.stringify({ error: result.reason }), {
        status: result.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Successfully updated user with index ' + result.rgIndex, {
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
