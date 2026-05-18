import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { GamesRepository } from '@/repository/GamesRepository';
import { GamesTable, UserMatchesView, UserWithGroups } from '@/types/supabaseTypes';
import { formatDateToDatabase } from '@/utils';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';

export const gamesKeys = {
  all: ['games'] as const,
  matches: () => [...gamesKeys.all, 'matches'] as const,
  match: (matchId?: string) => [...gamesKeys.matches(), matchId] as const,
  players: () => [...gamesKeys.all, 'players'] as const,
  teams: () => [...gamesKeys.all, 'teams'] as const,
};

export const useMatch = (matchId?: string) =>
  useQuery({
    queryKey: gamesKeys.match(matchId),
    queryFn: async () => {
      if (!matchId) return null;
      const result = await supabase
        .schema('games')
        .from('match')
        .select(
          '*, team_a: teams!team_a(*, player_1: players!player_1(*), player_2: players!player_2(*)), team_b: teams!team_b(*, player_1: players!player_1(*), player_2: players!player_2(*)), sets: sets(*), elo_calc_log: elo_calc_log(*), elo_history: elo_history!elo_history_match_fkey(*)'
        )
        .eq('id', matchId)
        .maybeSingle();

      if (!result.data) return null;

      const playerIds = [
        result.data.team_a.player_1.player,
        result.data.team_b.player_1.player,
        result.data.team_a.player_2.player,
        result.data.team_b.player_2.player,
      ];
      const { data: users } = await supabase.from('user').select('*').in('id', playerIds);
      const findUser = (id: string) => users?.find((u) => u.id === id) ?? null;

      return {
        ...result.data,
        player_1a: findUser(result.data.team_a.player_1.player),
        player_1b: findUser(result.data.team_b.player_1.player),
        player_2a: findUser(result.data.team_a.player_2.player),
        player_2b: findUser(result.data.team_b.player_2.player),
      };
    },
  });

export const useMatches = () =>
  useQuery<UserMatchesView[]>({
    queryKey: gamesKeys.matches(),
    queryFn: async () => {
      const result = await supabase.schema('games').from('user_matches').select('*').returns<UserMatchesView[]>();

      return result.data ?? [];
    },
  });

export const usePlayers = (user: UserWithGroups | null) =>
  useQuery<{ players: PlayerWithSimpleUser[], me: PlayerWithSimpleUser | null }>({
    queryKey: gamesKeys.players(),
    queryFn: async () => {
      const result = await GamesRepository.fetchAvailablePlayers();

      const me = result.find((x) => x.id === user?.id);

      return {
        players: result,
        me: me ?? null,
      }
    }
  });

export const useTeams = () =>
  useQuery<GamesTable<'teams'>[]>({
    queryKey: gamesKeys.teams(),
    queryFn: async () => {
      const result = await supabase.schema('games').from('teams').select('*');

      return result.data ?? [];
    },
  });

export const useCreateMatch = () =>
  useMutation({
    mutationFn: async ({
      sets,
      team_a,
      team_b,
      event,
      rating_enabled,
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
      created_by?: string;
      playerNamesMapping: { [key: string]: string };
    }) => {
      const result = await supabase
        .schema('games')
        .rpc('add_match_with_sets', {
          match_sets: sets.map((x) => ({ team_a_score: x.team_a_score, team_b_score: x.team_b_score })),
          player_1a: team_a.player_1,
          player_1a_rating: team_a.player_1_rating,
          player_2a: team_a.player_2,
          player_2a_rating: team_a.player_2_rating,
          player_1b: team_b.player_1,
          player_1b_rating: team_b.player_1_rating,
          player_2b: team_b.player_2,
          player_2b_rating: team_b.player_2_rating,
          team_a: team_a.name,
          team_b: team_b.name,
          event: event,
          rated: rating_enabled,
          created_by: created_by,
          player_names: playerNamesMapping
        })
        .throwOnError();

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
      const result = await supabase
        .schema('games')
        .from('sets')
        .upsert(
          sets
        )
        .select('*')
        .throwOnError();

      const result2 = await supabase
        .schema('games')
        .from('sets')
        .delete()
        .not('id', 'in', `(${sets.map((x) => `${x.id}`).join(',')})`)
        .eq('match', matchId)
        .throwOnError();

      return { result: result.data, result2: result2.data };
    },
    onMutate: async ({ sets }) => {
      await queryClient.cancelQueries({ queryKey: gamesKeys.matches() });

      const previousMatches = queryClient.getQueryData<FullUserMatch[]>(gamesKeys.matches());

      if (previousMatches) {
        const newMatches = previousMatches.map((x) => {
          if (x.id === matchId) {
            return {
              ...x,
              set_results: sets.map((x) => x.team_a_score + ':' + x.team_b_score).join(', '),
            };
          }
          return x;
        });
        queryClient.setQueryData<FullUserMatch[]>(gamesKeys.matches(), newMatches);
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
      const result = await supabase.schema('games').from('match').delete().eq('id', matchId).select('*').throwOnError();

      return result.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: gamesKeys.matches() });

      const previousMatches = queryClient.getQueryData<FullUserMatch[]>(gamesKeys.matches());

      if (previousMatches) {
        const newMatches = previousMatches.filter((x) => x.id !== matchId);
        queryClient.setQueryData<FullUserMatch[]>(gamesKeys.matches(), newMatches);
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
