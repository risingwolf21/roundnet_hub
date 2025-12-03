import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery } from '@tanstack/react-query';
import { GamesTableUpdate } from '../types/supabaseTypes';

export const usePlayer = (user: User) =>
  useQuery<PlayerPublic | null>({
    queryKey: ['player_data', user.id],
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
      await queryClient.cancelQueries({ queryKey: ['player_data', user.id] });

      const previousPlayer = queryClient.getQueryData<Player | null>(['player_data', user.id]);

      if (previousPlayer) {
        const newPlayer = {
          ...previousPlayer,
          ...updates,
        };
        queryClient.setQueryData<Player | null>(['player_data', user.id], newPlayer);
      }

      return { previousPlayer };
    },
    onError: (_e, _v, context) => {
      if (context?.previousPlayer) {
        queryClient.setQueryData(['player_data', user.id], context.previousPlayer);
      }
    },
    onSettled: (_d, _e, _v, _context) => {
      queryClient.invalidateQueries({ queryKey: ['player_data', user.id] });
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
      await queryClient.cancelQueries({ queryKey: ['player_data', user.id] });

      const previousPlayer = queryClient.getQueryData<Player | null>(['player_data', user.id]);

      if (previousPlayer) {
        const newPlayer = {
          ...previousPlayer,
          hide_rating: hide_rating,
        };
        queryClient.setQueryData<Player | null>(['player_data', user.id], newPlayer);
      }

      return { previousPlayer };
    },
    onError: (_e, _v, context) => {
      if (context?.previousPlayer) {
        queryClient.setQueryData(['player_data', user.id], context.previousPlayer);
      }
    },
    onSettled: (_d, _e, _v, _context) => {
      queryClient.invalidateQueries({ queryKey: ['player_data', user.id] });
    },
  });

export const useEloHistory = (user: User) =>
  useQuery({
    queryKey: ['el_history', user.id],
    queryFn: async () => {
      const result = await supabase.schema('games').from('elo_history').select('*').eq('user', user.id);

      return result.data ?? [];
    },
  });
