// Loads the Deutsche Roundnet Liga from the Roundnet Germany playerzone into the bundesliga_*
// tables: the season's leagues, their teams and rosters, every match day with its groups and
// encounter results, and the league table. The app only reads those tables.
//
// Actions (POST JSON):
//   season        { link }      admin: set the season from a playerzone tournament link, find its leagues
//   discover      {}            admin: the active season's leagues (found on first use)
//   refreshLeague { leagueId }  admin: reload one league completely, rosters included
//   nightly       {}            cron: reload schedules, results and standings of all leagues in the
//                               background (rosters stay); skipped if everything is fresh
// "admin" = permission `bundesliga.admin` (or `supabase.admin`), checked with the caller's JWT.
import * as Sentry from 'sentry';
import { withSentry } from '../_shared/sentry.ts';
import { createClient } from 'supabase';
import { localized } from '../_shared/lang.ts';
import { tournamentSlug } from './parse.ts';
import { findLeagues, livePlayerzone, scrapeLeague } from './scrape.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Service-role client: the only writer of the bundesliga_* tables.
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

Sentry.init({
  dsn: 'https://a06f63fae5ab4ce4ac291d0d6fb4e989@o4505379650666496.ingest.sentry.io/4505379651649536',
  defaultIntegrations: false,
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
});
Sentry.setTag('region', Deno.env.get('SB_REGION'));
Sentry.setTag('execution_id', Deno.env.get('SB_EXECUTION_ID'));

// Supabase's edge runtime keeps a request's background work running after the response.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

const get = livePlayerzone(250);
// The nightly run does nothing when every league was refreshed this recently.
const NIGHTLY_MIN_AGE_MS = 6 * 60 * 60 * 1000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept-language, app_version', // app_version: sent by the app's supabase client
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });

async function isAdmin(authHeader: string): Promise<boolean> {
  if (!authHeader) return false;
  const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const [a, b] = await Promise.all([
    caller.rpc('authorize', { requested_permission: 'bundesliga.admin' }),
    caller.rpc('authorize', { requested_permission: 'supabase.admin' }),
  ]);
  return a.data === true || b.data === true;
}

type Season = { id: number; tournament_slug: string; name: string | null };
type League = { id: number; name: string; teams_page_id: string; schedule_slug: string | null; refreshed_at: string | null };

async function leaguesOf(seasonId: number): Promise<League[]> {
  const { data, error } = await admin
    .from('bundesliga_leagues')
    .select('id, name, teams_page_id, schedule_slug, refreshed_at')
    .eq('season_id', seasonId)
    .order('sort');
  if (error) throw error;
  return (data ?? []) as League[];
}

/** Makes the tournament the active season and stores its leagues. */
async function activateSeason(slug: string): Promise<{ season: Season; leagues: League[] }> {
  const { name, leagues } = await findLeagues(get, slug);
  const { data, error } = await admin.rpc('bundesliga_activate_season', {
    p_slug: slug,
    p_name: name,
    p_leagues: leagues.map((l, i) => ({ name: l.name, sort: i + 1, teams_page_id: l.teamsPageId, schedule_slug: l.scheduleSlug })),
  });
  if (error) throw error;
  const id = data as number;
  return { season: { id, tournament_slug: slug, name }, leagues: await leaguesOf(id) };
}

/** The active season and its leagues; the leagues are found from playerzone the first time. */
async function activeLeagues(): Promise<{ season: Season; leagues: League[] } | null> {
  const { data: season, error } = await admin
    .from('bundesliga_seasons')
    .select('id, tournament_slug, name')
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  if (!season) return null;
  const leagues = await leaguesOf(season.id);
  return leagues.length ? { season, leagues } : await activateSeason(season.tournament_slug);
}

/** Scrapes one league and replaces its rows; returns counts for the admin screen. */
async function refreshLeague(season: Season, league: League, withRosters: boolean) {
  try {
    const rows = await scrapeLeague(get, season.tournament_slug, league, withRosters);
    const { error } = await admin.rpc('bundesliga_replace_league', { p_league_id: league.id, p_data: rows });
    if (error) throw error;
    return {
      league: { id: league.id, name: league.name },
      teams: rows.teams.length,
      players: rows.players?.length ?? null,
      matchdays: rows.matchdays.length,
      encounters: rows.encounters.length,
      played: rows.encounters.filter((e) => e.winner !== null).length,
    };
  } catch (error) {
    await admin.from('bundesliga_leagues').update({ refresh_error: String(error).slice(0, 500) }).eq('id', league.id);
    throw error;
  }
}

/** Results and standings of every league; rosters stay. Skipped while everything is fresh. */
async function nightly() {
  const active = await activeLeagues();
  if (!active) return;
  const stale = active.leagues.some(
    (l) => !l.refreshed_at || Date.now() - new Date(l.refreshed_at).getTime() > NIGHTLY_MIN_AGE_MS
  );
  if (!stale) return;
  for (const league of active.leagues) {
    try {
      await refreshLeague(active.season, league, false);
    } catch (error) {
      Sentry.captureException(error);
    }
  }
}

Deno.serve(withSentry(Sentry, async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'JSON-Body erforderlich' }, 400);
  }
  const action = String(payload.action ?? '');

  try {
    if (action === 'nightly') {
      const work = nightly().catch((error) => Sentry.captureException(error));
      if (typeof EdgeRuntime !== 'undefined') {
        EdgeRuntime.waitUntil(work);
        return json({ started: true }, 202);
      }
      await work;
      return json({ done: true });
    }

    if (!(await isAdmin(req.headers.get('Authorization') ?? ''))) {
      return json({ error: localized(req, 'Keine Berechtigung (bundesliga.admin).', 'Not allowed (bundesliga.admin).') }, 403);
    }

    if (action === 'season') {
      const slug = tournamentSlug(String(payload.link ?? ''));
      if (!slug) {
        return json({ error: localized(req, 'Das ist kein Playerzone-Turnierlink.', 'That is not a playerzone tournament link.') }, 400);
      }
      return json(await activateSeason(slug));
    }

    if (action === 'discover') {
      const active = await activeLeagues();
      if (!active) return json({ error: localized(req, 'Keine aktive Saison.', 'No active season.') }, 404);
      return json(active);
    }

    if (action === 'refreshLeague') {
      const active = await activeLeagues();
      const league = active?.leagues.find((l) => l.id === Number(payload.leagueId));
      if (!active || !league) return json({ error: localized(req, 'Liga nicht gefunden.', 'League not found.') }, 404);
      return json(await refreshLeague(active.season, league, true));
    }

    return json({ error: `Unbekannte action: ${action}` }, 400);
  } catch (error) {
    Sentry.captureException(error);
    return json({ error: localized(req, 'Interner Serverfehler', 'Internal server error'), details: String(error) }, 500);
  }
}));
