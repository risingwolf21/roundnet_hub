import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { GamesTableUpdate } from '../types/supabaseTypes';

export const playerDataKeys = {
  all: ['player_data'] as const,
  player: (playerId: string) => [...playerDataKeys.all, playerId] as const,
  eloHistory: (playerId: string) => [...playerDataKeys.player(playerId), 'elo_history'] as const,
};

export const useEloHistory = (user: User) =>
  useQuery({
    queryKey: playerDataKeys.eloHistory(user.id),
    queryFn: async () => {
      const result = await supabase.schema('games').from('elo_history').select('*').eq('user', user.id);

      return result.data ?? [];
    },
  });

export const usePlayer = (user: User) =>
  useQuery<PlayerPublic | null>({
    queryKey: playerDataKeys.player(user.id),
    queryFn: async () => {
      const result = await supabase
        .schema('games')
        .from('players_public')
        .select('*')
        .eq('player', user.id)
        .maybeSingle()
        .throwOnError();

      return result.data;
    },
  });

export const useUpdatePlayer = (user: User) =>
  useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: async ({ updates }: { updates: GamesTableUpdate<'players'> }) => {
      const result = await supabase
        .schema('games')
        .from('players')
        .update(updates)
        .eq('player', user.id)
        .select('*')
        .throwOnError();

      return result.data;
    },
    onMutate: async ({ updates }) => {
      await queryClient.cancelQueries({ queryKey: playerDataKeys.player(user.id) });

      const previousPlayer = queryClient.getQueryData<Player | null>(playerDataKeys.player(user.id));

      if (previousPlayer) {
        const newPlayer = {
          ...previousPlayer,
          ...updates,
        };
        queryClient.setQueryData<Player | null>(playerDataKeys.player(user.id), newPlayer);
      }

      return { previousPlayer };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          userName: user.name,
          userId: user.id,
          ...error,
          ...variables,
        },
        tags: { type: 'UpdatePlayer', scope: 'games' },
      });
      if (context?.previousPlayer) {
        queryClient.setQueryData(playerDataKeys.player(user.id), context.previousPlayer);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: playerDataKeys.player(user.id) });
    },
  });

export const useUpdateIndexHidden = (user: User) =>
  useMutation({
    mutationFn: async ({ hide_rating }: { hide_rating: boolean }) => {
      const result = await supabase
        .schema('games')
        .from('players')
        .update({ hide_rating: hide_rating })
        .eq('player', user.id)
        .select('*')
        .throwOnError();

      return result.data;
    },
    onMutate: async ({ hide_rating }) => {
      await queryClient.cancelQueries({ queryKey: playerDataKeys.player(user.id) });

      const previousPlayer = queryClient.getQueryData<Player | null>(playerDataKeys.player(user.id));

      if (previousPlayer) {
        const newPlayer = {
          ...previousPlayer,
          hide_rating: hide_rating,
        };
        queryClient.setQueryData<Player | null>(playerDataKeys.player(user.id), newPlayer);
      }

      return { previousPlayer };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          userName: user.name,
          userId: user.id,
          ...error,
          ...variables,
        },
        tags: { type: 'UpdateIndexHidden', scope: 'games' },
      });
      if (context?.previousPlayer) {
        queryClient.setQueryData(['player_data', user.id], context.previousPlayer);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: playerDataKeys.player(user.id) });
    },
  });
