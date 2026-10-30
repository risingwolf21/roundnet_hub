import { useQuery } from '@tanstack/react-query';
import { BundesligaRepository, type LeagueResponse, type RostersResponse } from './repository';

export const bundesligaKeys = {
  all: ['bundesliga'] as const,
  league: (leagueId: string) => [...bundesligaKeys.all, 'league', leagueId] as const,
  rosters: (versionIds: string[]) => [...bundesligaKeys.all, 'rosters', ...versionIds] as const,
};

export const useLeagueData = (leagueId: string | undefined) =>
  useQuery<LeagueResponse>({
    queryKey: bundesligaKeys.league(leagueId ?? ''),
    enabled: !!leagueId,
    queryFn: () => BundesligaRepository.fetchLeague(leagueId!),
    staleTime: 10 * 60 * 1000,
  });

/** Fetch rosters for a set of teams. Keyed by the sorted version ids so selections dedupe. */
export const useRosters = (teams: { teamId: string; teamVersionId: string }[]) => {
  const sorted = [...teams].sort((a, b) => a.teamVersionId.localeCompare(b.teamVersionId));
  const versionIds = sorted.map((t) => t.teamVersionId);
  return useQuery<RostersResponse>({
    queryKey: bundesligaKeys.rosters(versionIds),
    enabled: sorted.length > 0,
    queryFn: () => BundesligaRepository.fetchRosters(sorted),
    staleTime: 10 * 60 * 1000,
  });
};
