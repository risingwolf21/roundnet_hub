import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery } from '@tanstack/react-query';

export const usePlayer = (user: User) =>
  useQuery<PlayerPublic | null>({
    queryKey: ['player_data', user.userId],
    queryFn: async () => {
      const result = await supabase
        .schema('games')
        .from('players_public')
        .select('*')
        .eq('player', user.userId)
        .maybeSingle()
        .throwOnError();

      return result.data;
    },
  });

export const useUpdateIndexHidden = (user: User) =>
  useMutation({
    mutationFn: async ({ hide_rating }: { hide_rating: boolean }) => {
      const result = await supabase
        .schema('games')
        .from('players')
        .update({ hide_rating: hide_rating })
        .eq('player', user.userId)
        .select('*')
        .throwOnError();

      return result.data;
    },
    onMutate: async ({ hide_rating }) => {
      await queryClient.cancelQueries({ queryKey: ['player_data', user.userId] });

      const previousPlayer = queryClient.getQueryData<Player | null>(['player_data', user.userId]);

      if (previousPlayer) {
        const newPlayer = {
          ...previousPlayer,
          hide_rating: hide_rating,
        };
        queryClient.setQueryData<Player | null>(['player_data', user.userId], newPlayer);
      }

      return { previousPlayer };
    },
    onError: (_e, _v, context) => {
      if (context?.previousPlayer) {
        queryClient.setQueryData(['player_data', user.userId], context.previousPlayer);
      }
    },
    onSettled: (_d, _e, _v, _context) => {
      queryClient.invalidateQueries({ queryKey: ['player_data', user.userId] });
    },
  });

export const useEloHistory = (user: User) =>
  useQuery({
    queryKey: ['el_history', user.userId],
    queryFn: async () => {
      const result = await supabase.schema('games').from('elo_history').select('*').eq('user', user.userId);

      return result.data ?? [];
    },
  });
