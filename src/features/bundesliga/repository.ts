// Talks to the `fetch-bundesliga` edge function (scrapes the Roundnet Germany playerzone)
// but serves from the `public.bundesliga_cache` table whenever the cached data is still
// fresh (fetched after the most recent 02:00 Europe/Berlin). The edge function is only
// invoked when the cache is missing/stale, or when an admin forces a hard reload — so we
// neither re-run the function nor re-scrape playerzone on every view.
import { supabase } from '@/lib/supabase';

export interface ScrapedTeam {
  teamId: string;
  teamVersionId: string;
  name: string;
  logoUrl: string | null;
  rgxTotal: number | null;
  firstNames: string[];
}

export interface ScrapedMatchDay {
  id: string;
  md: string | null;
  name: string;
  date: string | null;
  city: string | null;
  teams: { teamId: string; teamVersionId: string; name: string }[];
}

export type ScrapedGender = 'male' | 'female' | 'unknown';

export interface ScrapedPlayer {
  id: string;
  slug: string;
  name: string;
  gender: ScrapedGender;
  rgIndex: number | null;
  avatarUrl: string | null;
  pro: boolean;
}

export interface LeagueOption {
  id: string;
  name: string;
}

export interface LeagueResponse {
  league: LeagueOption;
  leagues: LeagueOption[];
  teams: ScrapedTeam[];
  matchDays: ScrapedMatchDay[];
}

export interface RostersResponse {
  rosters: Record<string, ScrapedPlayer[]>;
}

const FN_BASE = import.meta.env.DEV
  ? 'http://127.0.0.1:54321/functions/v1'
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

const leagueKey = (leagueId: string) => `league:${leagueId}`;
const rosterKey = (teamVersionId: string) => `roster:${teamVersionId}`;

interface CacheRow {
  cache_key: string;
  payload: unknown;
  fetched_at: string;
  is_fresh: boolean;
}

/** Read fresh cache rows for the given keys (missing/stale keys are simply absent). */
async function readFreshCache(keys: string[]): Promise<Map<string, unknown>> {
  if (keys.length === 0) return new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_bundesliga_cache', { p_keys: keys });
  if (error) return new Map(); // cache is an optimization; fall back to the edge function
  const rows = (data ?? []) as CacheRow[];
  return new Map(rows.filter((r) => r.is_fresh).map((r) => [r.cache_key, r.payload]));
}

async function invokeEdge<T>(body: Record<string, unknown>): Promise<T> {
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session?.session?.access_token;
  if (!accessToken) throw new Error('Nicht angemeldet');

  const resp = await fetch(`${FN_BASE}/fetch-bundesliga`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(await resp.text());
  const json = await resp.json();
  if (json?.error) throw new Error(json.details ? `${json.error}: ${json.details}` : json.error);
  return json as T;
}

export const BundesligaRepository = {
  async fetchLeague(leagueId: string, opts: { force?: boolean } = {}): Promise<LeagueResponse> {
    if (!opts.force) {
      const cache = await readFreshCache([leagueKey(leagueId)]);
      const hit = cache.get(leagueKey(leagueId));
      if (hit) return hit as LeagueResponse;
    }
    return invokeEdge<LeagueResponse>({ action: 'league', leagueId, force: opts.force ?? false });
  },

  async fetchRosters(
    teams: { teamId: string; teamVersionId: string }[],
    opts: { force?: boolean } = {}
  ): Promise<RostersResponse> {
    const rosters: Record<string, ScrapedPlayer[]> = {};
    let missing = teams;

    if (!opts.force) {
      const cache = await readFreshCache(teams.map((t) => rosterKey(t.teamVersionId)));
      missing = [];
      for (const t of teams) {
        const hit = cache.get(rosterKey(t.teamVersionId));
        if (hit) rosters[t.teamId] = hit as ScrapedPlayer[];
        else missing.push(t);
      }
      if (missing.length === 0) return { rosters };
    }

    const fresh = await invokeEdge<RostersResponse>({
      action: 'rosters',
      teams: missing,
      force: opts.force ?? false,
    });
    return { rosters: { ...rosters, ...fresh.rosters } };
  },
};
