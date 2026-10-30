// Talks to the `fetch-bundesliga` edge function, which scrapes the Roundnet Germany
// playerzone. Mirrors the direct-fetch pattern used for the other edge functions
// (see EditUserDialog / management-api): POST to functions.supabase.co with the user JWT.
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

const FN_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co`;

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
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
  fetchLeague: (leagueId: string) => invoke<LeagueResponse>({ action: 'league', leagueId }),

  fetchRosters: (teams: { teamId: string; teamVersionId: string }[]) =>
    invoke<RostersResponse>({ action: 'rosters', teams }),
};
