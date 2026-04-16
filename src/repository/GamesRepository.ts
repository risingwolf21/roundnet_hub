import { supabase } from '@/lib/supabase';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import _ from 'lodash';
import { fetchSimpleUser } from './UserRepository';

export const fetchMatch = () =>
  supabase.schema('games').from('match').select(`
     *,
      team_a: teams!match_team_a_fkey (
        name,
        player1: players!player_1 (
          *
        ),
        player2: players!player_2 (
          *
        )
      ),
      team_b: teams!match_team_b_fkey (
        name,
        player1: players!player_1 (
          *
        ),
        player2: players!player_2 (
          *
        )
      ),
      sets(*)
  `);

export const GamesRepository = {

  async fetchGamesForEvent(eventId: string): Promise<FullMatch[]> {
    const result = await fetchMatch().eq('event', eventId).throwOnError();

    return result.data ?? [];
  },

  async fetchAvailablePlayers(): Promise<(PlayerWithSimpleUser | Player)[]> {
    const { data: simpleUsers } = await fetchSimpleUser();
    const { data: players } = await supabase.schema('games').from('players').select('*');

    const usersById = _.keyBy(simpleUsers || [], 'id');

    const combinedPlayers = (players || []).map((player) => {

      if (player.linked_user_id && usersById[player.linked_user_id]) {
        return {
          ...player,
          ...usersById[player.linked_user_id],
        } as PlayerWithSimpleUser;
      }

      return {
        ...player
      } as Player;

    });

    return combinedPlayers.sort((x, y) => (x.display_name || '').localeCompare(y.display_name || ''));
  },

  async reportScores(
    {
      sets, team_a, team_b, event, created_by, is_public, player_names
    }: {
      sets: { team_a_score: number; team_b_score: number }[],
      team_a: {
        player_1: string;
        player_1_rating: number;
        player_2: string;
        player_2_rating: number;
        name: string;
      },
      team_b: {
        player_1: string;
        player_1_rating: number;
        player_2: string;
        player_2_rating: number;
        name: string;
      },
      event?: string,
      created_by?: string,
      is_public?: boolean,
      player_names?: { [key: string]: string }
    }
  ): Promise<PostgrestSingleResponse<string>> {
    return supabase
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
        event,
        created_by,
        is_public,
        player_names
      })
      .throwOnError();
  },
};
