import { queryClient } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BundesligaRepository, type BundesligaLeague, type LeagueView } from './repository';
import { plannerMatchDays, type PlannerMatchDay } from './teamView';

export const bundesligaKeys = {
  all: ['bundesliga'] as const,
  season: () => [...bundesligaKeys.all, 'season'] as const,
  league: (leagueId: number) => [...bundesligaKeys.all, 'league', leagueId] as const,
  teamsOfPlayer: (pzPlayerId: string) => [...bundesligaKeys.all, 'teams_of_player', pzPlayerId] as const,
  rosters: (leagueId: number, teamIds: string[]) => [...bundesligaKeys.all, 'rosters', leagueId, ...teamIds] as const,
};

const STALE = 10 * 60 * 1000;

export const useBundesligaSeason = () =>
  useQuery({ queryKey: bundesligaKeys.season(), queryFn: () => BundesligaRepository.fetchSeason(), staleTime: STALE });

export const useLeagueView = (leagueId: number | null | undefined) =>
  useQuery<LeagueView>({
    queryKey: bundesligaKeys.league(leagueId ?? 0),
    enabled: !!leagueId,
    queryFn: () => BundesligaRepository.fetchLeagueView(leagueId!),
    staleTime: STALE,
  });

/** The teams whose roster lists this playerzone player (the number of their RG ID). */
export const useTeamsOfPlayer = (pzPlayerId: string | null, leagues: BundesligaLeague[]) =>
  useQuery({
    queryKey: bundesligaKeys.teamsOfPlayer(pzPlayerId ?? ''),
    enabled: !!pzPlayerId && leagues.length > 0,
    queryFn: () => BundesligaRepository.fetchTeamsOfPlayer(pzPlayerId!, leagues.map((l) => l.id)),
    staleTime: STALE,
  });

export interface PlannerTeam {
  teamId: string;
  teamVersionId: string;
  name: string;
  logoUrl: string | null;
  rgxTotal: number | null;
}

export interface PlannerLeagueData {
  /** Database id of the league, for its rosters. */
  leagueDbId: number;
  leagues: { id: string; name: string }[];
  teams: PlannerTeam[];
  matchDays: PlannerMatchDay[];
}

/** The planner's view of a league, by playerzone teams page id (what the planner stores). */
export const useLeagueData = (teamsPageId: string | undefined) => {
  const season = useBundesligaSeason();
  const leagues = season.data?.leagues ?? [];
  const league = leagues.find((l) => l.teams_page_id === teamsPageId) ?? leagues[0];
  const view = useLeagueView(league?.id);
  const data: PlannerLeagueData | undefined =
    league && view.data
      ? {
          leagueDbId: league.id,
          leagues: leagues.map((l) => ({ id: l.teams_page_id, name: l.name })),
          teams: [...view.data.teams]
            .sort((a, b) => (b.rgx_total ?? 0) - (a.rgx_total ?? 0))
            .map((t) => ({ teamId: t.pz_team_id, teamVersionId: t.pz_team_version_id, name: t.name, logoUrl: t.logo_url, rgxTotal: t.rgx_total })),
          matchDays: plannerMatchDays(view.data),
        }
      : undefined;
  return {
    data,
    isLoading: season.isLoading || view.isLoading,
    isError: season.isError || view.isError,
    error: season.error ?? view.error,
  };
};

/** Rosters of the given teams of a league. Keyed by the sorted team ids so selections dedupe. */
export const useRosters = (leagueDbId: number | undefined, teamIds: string[]) => {
  const sorted = [...new Set(teamIds)].sort();
  return useQuery({
    queryKey: bundesligaKeys.rosters(leagueDbId ?? 0, sorted),
    enabled: !!leagueDbId && sorted.length > 0,
    queryFn: () => BundesligaRepository.fetchRosters(leagueDbId!, sorted),
    staleTime: STALE,
  });
};

// ---- admin -----------------------------------------------------------------

export const useSetBundesligaSeason = () =>
  useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: (link: string) => BundesligaRepository.setSeason(link),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bundesligaKeys.all }),
  });

export const useDiscoverBundesligaLeagues = () =>
  useMutation({ meta: { suppressErrorToast: true }, mutationFn: () => BundesligaRepository.discoverLeagues() });

export const useRefreshBundesligaLeague = () =>
  useMutation({ meta: { suppressErrorToast: true }, mutationFn: (leagueId: number) => BundesligaRepository.refreshLeague(leagueId) });

/** Admin: one call of the games refresh of a league; repeat while `pending` > 0. */
export const useRefreshBundesligaGames = () =>
  useMutation({ meta: { suppressErrorToast: true }, mutationFn: (leagueId: number) => BundesligaRepository.refreshGames(leagueId) });

/** After a refresh run: show the new data everywhere. */
export const invalidateBundesliga = () => queryClient.invalidateQueries({ queryKey: bundesligaKeys.all });
