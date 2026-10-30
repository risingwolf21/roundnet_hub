// Scrapes the Roundnet Germany playerzone for Bundesliga match-day planning:
//   - the teams of a league (1./2./3. Bundesliga, Regionalliga),
//   - the rendered match-day groups (opponents + date/city),
//   - and a team's roster (name, RGX, gender, avatar).
//
// It only reads public playerzone pages and returns JSON; it never touches our DB.
// Modelled on fetch-player-info (Cheerio over the server-rendered HTML).
import * as Sentry from 'sentry';
import {
  parseMatchDays,
  parseRoster,
  parseTeams,
  rosterHtmlFromResponse,
  type ScrapedMatchDay,
  type ScrapedPlayer,
} from './parse.ts';

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

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'Accept': 'text/html,application/json' } });
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status} ${res.statusText}`);
  return await res.text();
}

async function fetchRoster(teamVersionId: string): Promise<ScrapedPlayer[]> {
  const body = await fetchText(`${PZ}/tournament/get-team-info?id=${encodeURIComponent(teamVersionId)}`);
  return parseRoster(rosterHtmlFromResponse(body));
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

  try {
    if (action === 'league') {
      const leagueId = String(payload.leagueId ?? LEAGUES[0].id);
      const league = LEAGUES.find((l) => l.id === leagueId) ?? { id: leagueId, name: leagueId };

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

      return json({ league, leagues: LEAGUES, teams, matchDays });
    }

    if (action === 'rosters') {
      const teams = (payload.teams ?? []) as { teamId?: string; teamVersionId: string }[];
      if (!Array.isArray(teams) || teams.length === 0) {
        return json({ error: 'teams[] mit teamVersionId erforderlich' }, 400);
      }
      const rosters: Record<string, ScrapedPlayer[]> = {};
      // Sequential to be gentle on playerzone (match days have ~3 teams).
      for (const t of teams) {
        if (!t?.teamVersionId) continue;
        rosters[t.teamId ?? t.teamVersionId] = await fetchRoster(t.teamVersionId);
      }
      return json({ rosters });
    }

    return json({ error: `Unbekannte action: ${action}` }, 400);
  } catch (error) {
    Sentry.captureException(error);
    return json({ error: 'Interner Serverfehler', details: String(error) }, 500);
  }
});
