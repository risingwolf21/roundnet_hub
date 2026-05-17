import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
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
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('games')
        .from('leaderboard')
        .select('*')
        .gte('matches_played', minMatches)
        .order('rating', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
};

export const useMatch = (matchId?: string) =>
  useQuery({
    queryKey: gamesKeys.match(matchId),
    queryFn: async () => {
      if (!matchId) return null;

      const { data: match, error } = await supabase
        .schema('games')
        .from('match')
        .select(`
          *,
          sets(*),
          elo_calc_log(*),
          elo_history!elo_history_match_fkey(*)
        `)
        .eq('id', matchId)
        .maybeSingle();

      if (error) throw error;
      if (!match) return null;

      const playerIds = [match.a_player_1, match.a_player_2, match.b_player_1, match.b_player_2].filter(Boolean);

      // 3. Zuerst die linked_user_id aus games.players holen
      const { data: players } = await supabase
        .schema('games')
        .from('players')
        .select('*')
        .in('player', playerIds);

      const userIds = players?.map(p => p.linked_user_id).filter(x => x !== null) || [];

      // 4. Alle User-Profile in EINEM Request aus public.user laden
      const { data: users } = await supabase
        .from('user') // Standard-Schema ist public
        .select('*')
        .in('id', userIds);

      // 5. Mapping-Funktion
      const getUser = (playerId: string) => {
        const player = players?.find(p => p.player === playerId) ?? null;

        const user = users?.find(u => u.id === player?.linked_user_id) ?? null;

        return { player, user };
      };

      return {
        ...match,
        player_1a: getUser(match.a_player_1),
        player_2a: getUser(match.a_player_2),
        player_1b: getUser(match.b_player_1),
        player_2b: getUser(match.b_player_2),
      };
    },
    enabled: !!matchId,
  });

export const useMatches = () =>
  useQuery<UserMatchesView[]>({
    queryKey: gamesKeys.matches(),
    queryFn: async () => {
      const result = await supabase.schema('games').from('user_matches').select('*').returns<UserMatchesView[]>();

      return result.data ?? [];
    },
  });

export const usePlayerMatches = (player_id: string) => useQuery({
  queryKey: gamesKeys.playerMatches(player_id),
  queryFn: async () => {
    const result = await supabase
      .schema("games")
      .from('user_matches')
      .select("*")
      .or(`team_a_p1.eq.${player_id},team_a_p2.eq.${player_id},team_b_p1.eq.${player_id},team_b_p2.eq.${player_id}`)
      .order('created_at', { ascending: false });

    return result.data ?? [];
  }
})

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
          event: event,
          rated: rating_enabled,
          is_public: is_public,
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
      const result = await supabase.schema('games').from('match').delete().eq('id', matchId).select('*').throwOnError();

      return result.data;
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
