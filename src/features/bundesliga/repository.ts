// Reads the Bundesliga data the fetch-bundesliga edge function stores in the bundesliga_* tables,
// and calls that function for the admin's season and refresh actions.
import { supabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import i18n from 'i18next';

// The bundesliga_* tables are not in the generated types yet.
const db = supabase as unknown as SupabaseClient;

export interface BundesligaLeague {
  id: number;
  name: string;
  sort: number;
  /** Playerzone's teams page id; the planner's league id. */
  teams_page_id: string;
  refreshed_at: string | null;
  refresh_error: string | null;
}

export interface BundesligaSeason {
  id: number;
  tournament_slug: string;
  name: string | null;
  leagues: BundesligaLeague[];
}

export interface BundesligaTeam {
  pz_team_id: string;
  pz_team_version_id: string;
  name: string;
  logo_url: string | null;
  rgx_total: number | null;
}

export interface BundesligaStanding {
  pz_team_id: string;
  position: number;
  wins: number;
  draws: number;
  losses: number;
  sets_for: number;
  sets_against: number;
  points_for: number;
  points_against: number;
}

export interface BundesligaMatchday {
  pz_matchday_id: string;
  number: number;
}

export interface BundesligaGroup {
  pz_group_id: string;
  pz_matchday_id: string;
  name: string | null;
  play_date: string | null;
  city: string | null;
}

export interface BundesligaEncounter {
  pz_game_id: string;
  pz_group_id: string;
  team1_id: string;
  team2_id: string;
  boards1: number | null;
  boards2: number | null;
  sets1: number | null;
  sets2: number | null;
  winner: 1 | 2 | null;
}

/** One game (Open 1, Women …) of a played encounter; side 1 is the encounter's team1. */
export interface BundesligaGame {
  pz_game_id: string;
  pz_encounter_id: string;
  sort: number;
  discipline: string | null;
  pair1_name: string | null;
  pair2_name: string | null;
  /** Playerzone player ids (bundesliga_team_players.pz_player_id). */
  pair1_players: string[];
  pair2_players: string[];
  /** Points per set from side 1's view. */
  sets: [number, number][];
  winner: 1 | 2 | null;
}

/** Everything of one league the app shows. */
export interface LeagueView {
  teams: BundesligaTeam[];
  standings: BundesligaStanding[];
  matchdays: BundesligaMatchday[];
  groups: BundesligaGroup[];
  encounters: BundesligaEncounter[];
  games: BundesligaGame[];
}

export type ScrapedGender = 'male' | 'female' | 'unknown';

export interface ScrapedPlayer {
  id: string;
  name: string;
  gender: ScrapedGender;
  rgIndex: number | null;
  avatarUrl: string | null;
  pro: boolean;
}

export interface RefreshGamesResult {
  league: { id: number; name: string };
  /** Encounters whose games were fetched by this call. */
  fetched: number;
  /** Played encounters still without games: call again. */
  pending: number;
}

export interface RefreshLeagueResult {
  league: { id: number; name: string };
  teams: number;
  players: number | null;
  matchdays: number;
  encounters: number;
  played: number;
}

async function invokeEdge<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('fetch-bundesliga', {
    body,
    headers: { 'Accept-Language': i18n.resolvedLanguage ?? 'de' }, // the function answers errors in this language
  });
  if (error) {
    // Show the function's own message ("Keine Berechtigung …") instead of "non-2xx status code".
    const context = (error as { context?: Response }).context;
    const message = await context?.json?.().then((b: { error?: string }) => b?.error).catch(() => undefined);
    throw new Error(message ?? error.message);
  }
  return data as T;
}

export const BundesligaRepository = {
  /** The active season with its leagues, or null before an admin set one. */
  async fetchSeason(): Promise<BundesligaSeason | null> {
    const { data, error } = await db
      .from('bundesliga_seasons')
      .select('id, tournament_slug, name, leagues:bundesliga_leagues(id, name, sort, teams_page_id, refreshed_at, refresh_error)')
      .eq('active', true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const season = data as BundesligaSeason;
    return { ...season, leagues: [...season.leagues].sort((a, b) => a.sort - b.sort) };
  },

  /** The teams (league + team id) whose roster lists this playerzone player. */
  async fetchTeamsOfPlayer(pzPlayerId: string, leagueIds: number[]): Promise<{ league_id: number; pz_team_id: string }[]> {
    if (leagueIds.length === 0) return [];
    const { data, error } = await db
      .from('bundesliga_team_players')
      .select('league_id, pz_team_id')
      .eq('pz_player_id', pzPlayerId)
      .in('league_id', leagueIds);
    if (error) throw error;
    return data ?? [];
  },

  async fetchLeagueView(leagueId: number): Promise<LeagueView> {
    const rows = async <T>(table: string, columns: string): Promise<T[]> => {
      const { data, error } = await db.from(table).select(columns).eq('league_id', leagueId);
      if (error) throw error;
      return (data ?? []) as T[];
    };
    const [teams, standings, matchdays, groups, encounters, games] = await Promise.all([
      rows<BundesligaTeam>('bundesliga_teams', 'pz_team_id, pz_team_version_id, name, logo_url, rgx_total'),
      rows<BundesligaStanding>('bundesliga_standings', 'pz_team_id, position, wins, draws, losses, sets_for, sets_against, points_for, points_against'),
      rows<BundesligaMatchday>('bundesliga_matchdays', 'pz_matchday_id, number'),
      rows<BundesligaGroup>('bundesliga_md_groups', 'pz_group_id, pz_matchday_id, name, play_date, city'),
      rows<BundesligaEncounter>('bundesliga_encounters', 'pz_game_id, pz_group_id, team1_id, team2_id, boards1, boards2, sets1, sets2, winner'),
      rows<BundesligaGame>(
        'bundesliga_games',
        'pz_game_id, pz_encounter_id, sort, discipline, pair1_name, pair2_name, pair1_players, pair2_players, sets, winner'
      ),
    ]);
    return { teams, standings, matchdays, groups, encounters, games };
  },

  /** Rosters of the given teams, keyed by playerzone team id. */
  async fetchRosters(leagueId: number, teamIds: string[]): Promise<Record<string, ScrapedPlayer[]>> {
    if (teamIds.length === 0) return {};
    const { data, error } = await db
      .from('bundesliga_team_players')
      .select('pz_team_id, pz_player_id, name, gender, rg_index, avatar_url, pro')
      .eq('league_id', leagueId)
      .in('pz_team_id', teamIds);
    if (error) throw error;
    const rosters: Record<string, ScrapedPlayer[]> = {};
    for (const p of data ?? []) {
      (rosters[p.pz_team_id] ??= []).push({
        id: p.pz_player_id,
        name: p.name,
        gender: p.gender,
        rgIndex: p.rg_index,
        avatarUrl: p.avatar_url,
        pro: p.pro,
      });
    }
    return rosters;
  },

  /** Admin: make a playerzone tournament the active season (its leagues are found automatically). */
  setSeason(link: string) {
    return invokeEdge<{ season: { id: number; name: string | null }; leagues: { id: number; name: string }[] }>({ action: 'season', link });
  },

  /** Admin: the active season's leagues (found from playerzone the first time). */
  discoverLeagues() {
    return invokeEdge<{ leagues: { id: number; name: string }[] }>({ action: 'discover' });
  },

  /** Admin: reload one league completely, rosters included. */
  refreshLeague(leagueId: number) {
    return invokeEdge<RefreshLeagueResult>({ action: 'refreshLeague', leagueId });
  },

  /** Admin: fetch the games of played encounters not stored yet (about 100 s per call). */
  refreshGames(leagueId: number) {
    return invokeEdge<RefreshGamesResult>({ action: 'refreshGames', leagueId });
  },
};
