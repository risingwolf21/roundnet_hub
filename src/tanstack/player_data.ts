import { queryClient } from '@/lib/queryClient';
import { PlayerDataRepository } from '@/repository/PlayerDataRepository';
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
    queryFn: () => PlayerDataRepository.fetchEloHistory(user.id),
  });

export const usePlayer = (user: User) =>
  useQuery<PlayerPublic | null>({
    queryKey: playerDataKeys.player(user.id),
    queryFn: () => PlayerDataRepository.fetchPublicPlayer(user.id),
  });

export const useUpdatePlayer = (user: User) =>
  useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: async ({ updates }: { updates: GamesTableUpdate<'players'> }) => {
      return PlayerDataRepository.updatePlayer(user.id, updates);
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
      return PlayerDataRepository.updateIndexHidden(user.id, hide_rating);
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
