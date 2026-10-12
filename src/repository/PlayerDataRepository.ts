import { supabase } from '@/lib/supabase';
import { GamesTableUpdate } from '../types/supabaseTypes';

// Legacy users have player = user id, newer users are linked via linked_user_id.
const ownPlayerFilter = (userId: string) => `linked_user_id.eq.${userId},and(player.eq.${userId},linked_user_id.is.null)`;

export const PlayerDataRepository = {
  async fetchEloHistory(userId: string) {
    const result = await supabase.schema('games').from('elo_history').select('*').eq('user', userId).throwOnError();
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
      .or(ownPlayerFilter(userId))
      .select('*')
      .throwOnError();
    return result.data;
  },

  async updateIndexHidden(userId: string, hideRating: boolean) {
    const result = await supabase
      .schema('games')
      .from('players')
      .update({ hide_rating: hideRating })
      .or(ownPlayerFilter(userId))
      .select('*')
      .throwOnError();
    return result.data;
  },
};
