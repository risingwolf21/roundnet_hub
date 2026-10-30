// Scrapes the Roundnet Germany playerzone for Bundesliga match-day planning:
//   - the teams of a league (1./2./3. Bundesliga, Regionalliga),
//   - the rendered match-day groups (opponents + date/city),
//   - and a team's roster (name, RGX, gender, avatar).
//
// Results are cached in public.bundesliga_cache; the function only re-scrapes a key when
// its cached row is missing/stale (older than the most recent 02:00 Europe/Berlin) or when
// an admin forces a reload (`force: true`, gated by the `bundesliga.admin` permission).
import * as Sentry from 'sentry';
import { createClient } from 'supabase';
import {
  parseMatchDays,
  parseRoster,
  parseTeams,
  rosterHtmlFromResponse,
  type ScrapedMatchDay,
  type ScrapedPlayer,
} from './parse.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Service-role client: bypasses RLS to read/write the cache.
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

const PZ = 'https://playerzone.roundnetgermany.de';

// Current-season defaults; overridable per request so the function survives a season change.
const DEFAULT_TOURNAMENT = '793-2027-04-11-deutsche-roundnet-liga-2026-2027';
const DEFAULT_SCHEDULE_DIVISION = 'mixed-14358-gruppenphase';

// League dropdown ids on the teams page.
const LEAGUES: { id: string; name: string }[] = [
  { id: '2613', name: '1. Bundesliga' },
  { id: '2614', name: '2. Bundesliga' },
  { id: '2615', name: '3. Liga' },
  { id: '2616', name: 'Regionalliga' },
];

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

const leagueKey = (leagueId: string) => `league:${leagueId}`;
const rosterKey = (teamVersionId: string) => `roster:${teamVersionId}`;

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'Accept': 'text/html,application/json' } });
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status} ${res.statusText}`);
  return await res.text();
}

/** Cached payloads that are still fresh, keyed by cache_key. */
async function readFresh(keys: string[]): Promise<Map<string, unknown>> {
  if (keys.length === 0) return new Map();
  const { data, error } = await admin.rpc('get_bundesliga_cache', { p_keys: keys });
  if (error) return new Map();
  const rows = (data ?? []) as { cache_key: string; payload: unknown; is_fresh: boolean }[];
  return new Map(rows.filter((r) => r.is_fresh).map((r) => [r.cache_key, r.payload]));
}

async function writeCache(cache_key: string, payload: unknown): Promise<void> {
  const { error } = await admin
    .from('bundesliga_cache')
    .upsert({ cache_key, payload, fetched_at: new Date().toISOString() }, { onConflict: 'cache_key' });
  if (error) Sentry.captureException(error);
}

async function scrapeRoster(teamVersionId: string): Promise<ScrapedPlayer[]> {
  const body = await fetchText(`${PZ}/tournament/get-team-info?id=${encodeURIComponent(teamVersionId)}`);
  return parseRoster(rosterHtmlFromResponse(body));
}

/** For force=true, require the admin permission (via the caller's own JWT). */
async function assertCanForce(authHeader: string): Promise<boolean> {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'JSON-Body erforderlich' }, 400);
  }

  const action = String(payload.action ?? 'league');
  const tournament = String(payload.tournament ?? DEFAULT_TOURNAMENT);
  const scheduleDivision = String(payload.scheduleDivision ?? DEFAULT_SCHEDULE_DIVISION);
  const force = payload.force === true;

  try {
    if (force && !(await assertCanForce(req.headers.get('Authorization') || ''))) {
      return json({ error: 'Keine Berechtigung zum harten Neuladen (bundesliga.admin).' }, 403);
    }

    if (action === 'league') {
      const leagueId = String(payload.leagueId ?? LEAGUES[0].id);
      const league = LEAGUES.find((l) => l.id === leagueId) ?? { id: leagueId, name: leagueId };
      const key = leagueKey(leagueId);

      if (!force) {
        const hit = (await readFresh([key])).get(key);
        if (hit) return json(hit);
      }

      const teamsHtml = await fetchText(`${PZ}/tournaments/${tournament}/teams/${leagueId}`);
      const teams = parseTeams(teamsHtml);

      let matchDays: ScrapedMatchDay[] = [];
      try {
        const schedHtml = await fetchText(`${PZ}/tournaments/${tournament}/schedule/${scheduleDivision}`);
        matchDays = parseMatchDays(schedHtml);
      } catch (e) {
        // Schedule is best-effort; the planner falls back to manual opponent choice.
        Sentry.captureException(e);
      }

      const result = { league, leagues: LEAGUES, teams, matchDays };
      await writeCache(key, result);
      return json(result);
    }

    if (action === 'rosters') {
      const teams = (payload.teams ?? []) as { teamId?: string; teamVersionId: string }[];
      if (!Array.isArray(teams) || teams.length === 0) {
        return json({ error: 'teams[] mit teamVersionId erforderlich' }, 400);
      }

      const fresh = force
        ? new Map<string, unknown>()
        : await readFresh(teams.map((t) => rosterKey(t.teamVersionId)));

      const rosters: Record<string, ScrapedPlayer[]> = {};
      // Sequential to be gentle on playerzone (match days have ~3 teams).
      for (const t of teams) {
        if (!t?.teamVersionId) continue;
        const cached = fresh.get(rosterKey(t.teamVersionId));
        if (cached) {
          rosters[t.teamId ?? t.teamVersionId] = cached as ScrapedPlayer[];
          continue;
        }
        const players = await scrapeRoster(t.teamVersionId);
        rosters[t.teamId ?? t.teamVersionId] = players;
        await writeCache(rosterKey(t.teamVersionId), players);
      }
      return json({ rosters });
    }

    return json({ error: `Unbekannte action: ${action}` }, 400);
  } catch (error) {
    Sentry.captureException(error);
    return json({ error: 'Interner Serverfehler', details: String(error) }, 500);
  }
});
