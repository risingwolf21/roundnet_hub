import { supabase } from '@/lib/supabase';
import { GamesTableUpdate } from '../types/supabaseTypes';

export const PlayerDataRepository = {
  async fetchEloHistory(userId: string) {
    const result = await supabase.schema('games').from('elo_history').select('*').eq('user', userId);
    return result.data ?? [];
  },

  async fetchPublicPlayer(userId: string): Promise<PlayerPublic | null> {
    const result = await supabase
      .schema('games')
      .from('players_public')
      .select('*')
      .eq('player', userId)
      .maybeSingle()
      .throwOnError();
    return result.data;
  },

  async updatePlayer(userId: string, updates: GamesTableUpdate<'players'>) {
    const result = await supabase
      .schema('games')
      .from('players')
      .update(updates)
      .eq('player', userId)
      .select('*')
      .throwOnError();
    return result.data;
  },

  async updateIndexHidden(userId: string, hideRating: boolean) {
    const result = await supabase
      .schema('games')
      .from('players')
      .update({ hide_rating: hideRating })
      .eq('player', userId)
      .select('*')
      .throwOnError();
    return result.data;
  },
};
