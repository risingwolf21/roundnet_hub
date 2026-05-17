import { queryClient } from '@/lib/queryClient';
import { GamesRepository } from '@/repository/GamesRepository';
import { GamesTable, UserWithGroups } from '@/types/supabaseTypes';
import { formatDateToDatabase } from '@/utils';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';

export const gamesKeys = {
  all: ['games'] as const,
  matches: () => [...gamesKeys.all, 'matches'] as const,
  match: (matchId?: string) => [...gamesKeys.matches(), matchId] as const,
  players: () => [...gamesKeys.all, 'players'] as const,
  playerMatches: (player_id: string) => [...gamesKeys.players(), player_id, 'matches'] as const,
  Leaderboard: (minMatches: number) => [...gamesKeys.all, 'leaderboard', minMatches] as const,
};

export const useLeaderboard = (minMatches = 5) => {
  return useQuery({
    queryKey: gamesKeys.Leaderboard(minMatches),
    queryFn: () => GamesRepository.fetchLeaderboard(minMatches),
  });
};

export const useMatch = (matchId?: string) =>
  useQuery({
    queryKey: gamesKeys.match(matchId),
    queryFn: () => (matchId ? GamesRepository.fetchMatchWithDetails(matchId) : null),
    enabled: !!matchId,
  });

export const useMatches = () =>
  useQuery<UserMatchesView[]>({
    queryKey: gamesKeys.matches(),
    queryFn: () => GamesRepository.fetchUserMatches(),
  });

export const usePlayerMatches = (player_id: string) => useQuery({
  queryKey: gamesKeys.playerMatches(player_id),
  queryFn: () => GamesRepository.fetchPlayerMatches(player_id),
});

export const usePlayers = (user: UserWithGroups | null) =>
  useQuery<{ players: (PlayerWithSimpleUser | Player)[], me: PlayerWithSimpleUser | null }>({
    queryKey: gamesKeys.players(),
    queryFn: async () => {
      const result = await GamesRepository.fetchAvailablePlayers();

      const me = result.find((x) => 'id' in x && x.id === user?.id);

      return {
        players: result,
        me: me && 'id' in me ? me as PlayerWithSimpleUser : null,
      }
    }
  });

export const useCreateMatch = () =>
  useMutation({
    mutationFn: async ({
      sets,
      team_a,
      team_b,
      event,
      rating_enabled,
      is_public,
      created_by,
      playerNamesMapping,
    }: {
      sets: { team_a_score: number; team_b_score: number }[];
      team_a: {
        player_1: string;
        player_1_rating: number;
        player_2: string;
        player_2_rating: number;
        name: string;
      };
      team_b: {
        player_1: string;
        player_1_rating: number;
        player_2: string;
        player_2_rating: number;
        name: string;
      };
      event?: string;
      rating_enabled: boolean;
      is_public: boolean;
      created_by?: string;
      playerNamesMapping: { [key: string]: string };
    }) => {
      const result = await GamesRepository.createMatchWithSets({
        sets,
        team_a,
        team_b,
        event,
        rated: rating_enabled,
        is_public,
        created_by,
        player_names: playerNamesMapping,
      });
      return result.data;
    },
    onMutate: async ({ sets, team_a, team_b }) => {
      await queryClient.cancelQueries({ queryKey: gamesKeys.matches() });

      const previousMatches = queryClient.getQueryData<UserMatchesView[]>(gamesKeys.matches());

      if (previousMatches) {
        const newMatches = [
          ...previousMatches,
          {
            team_a_name: team_a.name,
            team_b_name: team_b.name,
            set_results: sets.map((x) => x.team_a_score + ':' + x.team_b_score).join(', '),
            created_at: formatDateToDatabase(new Date()),
          },
        ] as UserMatchesView[];
        queryClient.setQueryData<UserMatchesView[]>(gamesKeys.matches(), newMatches);
      }

      return { previousMatches };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'CreateMatch', scope: 'games' },
      });
      if (context?.previousMatches) {
        queryClient.setQueryData(gamesKeys.matches(), context.previousMatches);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: gamesKeys.matches() });
    },
  });

export const useUpsertSetsToMatch = (matchId: string) =>
  useMutation({
    mutationFn: async ({ sets }: { sets: GamesTable<'sets'>[] }) => {
      return GamesRepository.upsertSetsToMatch(matchId, sets);
    },
    onMutate: async ({ sets }) => {
      await queryClient.cancelQueries({ queryKey: gamesKeys.matches() });

      const previousMatches = queryClient.getQueryData<UserMatchesView[]>(gamesKeys.matches());

      if (previousMatches) {
        const newMatches = previousMatches.map((x) => {
          if (x.match_id === matchId) {
            return {
              ...x,
              set_scores: sets.map((x) => x.team_a_score + ':' + x.team_b_score).join(', '),
            };
          }
          return x;
        });
        queryClient.setQueryData<UserMatchesView[]>(gamesKeys.matches(), newMatches);
      }

      return { previousMatches };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'UpsertSetsToMatch', scope: 'games' },
      });
      if (context?.previousMatches) {
        queryClient.setQueryData(gamesKeys.matches(), context.previousMatches);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: gamesKeys.matches() });
    },
  });

export const useDeleteMatch = (matchId?: string) =>
  useMutation({
    mutationFn: async () => {
      if (!matchId) {
        throw new Error('Match not found');
      }
      return GamesRepository.deleteMatch(matchId);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: gamesKeys.matches() });

      const previousMatches = queryClient.getQueryData<UserMatchesView[]>(gamesKeys.matches());

      if (previousMatches) {
        const newMatches = previousMatches.filter((x) => x.match_id !== matchId);
        queryClient.setQueryData<UserMatchesView[]>(gamesKeys.matches(), newMatches);
      }

      return { previousMatches };
    },
    onError: (error, _variables, context) => {
      captureException(error, {
        extra: {
          ...error,
        },
        tags: { type: 'DeleteMatch', scope: 'games' },
      });
      if (context?.previousMatches) {
        queryClient.setQueryData(gamesKeys.matches(), context.previousMatches);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: gamesKeys.matches() });
    },
  });
