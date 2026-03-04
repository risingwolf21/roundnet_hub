import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export const useProfile = (payload: { userId?: string | null, playerId?: string | null }) =>
  useQuery({
    queryKey: ['profile', payload.userId, payload.playerId],
    queryFn: async () => {
      const result = payload.userId ? await supabase.schema('public')
        .from('user')
        .select('*')
        .eq('id', payload.userId)
        .maybeSingle()
        .throwOnError() : null;

      const playerResult = payload.playerId ? await supabase.schema('games')
        .from('players')
        .select('*')
        .eq('player', payload.playerId)
        .maybeSingle()
        .throwOnError() : null;

      return {
        user: result?.data ?? null,
        player: playerResult?.data ?? null,
        avatarUrl: result?.data?.avatarUrl || playerResult?.data?.rg_avatar_url || null,
        displayName: result?.data?.name || playerResult?.data?.display_name || 'Unbekannter Spieler',
      };
    },
  });