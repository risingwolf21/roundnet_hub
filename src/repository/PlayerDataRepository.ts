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

  /** Players with an RG ID, and how many of them have no RG-Index (null or 0). */
  async fetchPlayerzoneStats() {
    const linked = await supabase
      .schema('games')
      .from('players')
      .select('player', { count: 'exact', head: true })
      .not('rg_id', 'is', null)
      .throwOnError();
    const withoutIndex = await supabase
      .schema('games')
      .from('players')
      .select('player', { count: 'exact', head: true })
      .not('rg_id', 'is', null)
      .or('rg_index.is.null,rg_index.eq.0')
      .throwOnError();
    return { linked: linked.count ?? 0, withoutIndex: withoutIndex.count ?? 0 };
  },

  /** One batch of "reload everyone" in the fetch-player-info edge function; call again with `next` until it is null. */
  async refreshPlayerzoneBatch(offset: number): Promise<PlayerzoneRefreshBatch> {
    const { data, error } = await supabase.functions.invoke<PlayerzoneRefreshBatch>('fetch-player-info', {
      body: { all: true, offset },
    });
    if (error) throw error;
    return data!;
  },
};

export interface PlayerzoneRefreshBatch {
  total: number;
  processed: number;
  updated: number;
  unrated: number;
  failed: { rg_id: string; name: string | null; reason: 'invalid_rg_id' | 'not_found' | 'fetch_failed' | 'unreadable' | 'internal' }[];
  next: number | null;
}
