import { supabase } from '@/lib/supabase';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import _ from 'lodash';
import { fetchSimpleUser } from './UserRepository';

export const fetchUserMatches = () =>
  supabase
    .schema('games')
    .from('user_matches')
    .select(
      '*, team_a_player_1: players!team_a_player_1(*), team_a_player_2: players!team_a_player_2(*), team_b_player_1: players!team_b_player_1(*), team_b_player_2: players!team_b_player_2(*)'
    )
    .order('created_at', { ascending: false });

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
  async fetchGamesForUser(): Promise<FullUserMatch[]> {
    const result = await fetchUserMatches().throwOnError();

    return result.data ?? [];
  },

  async fetchGamesForEvent(eventId: string): Promise<FullMatch[]> {
    const result = await fetchMatch().eq('event', eventId).throwOnError();

    return result.data ?? [];
  },

  async fetchAvailablePlayers(): Promise<PlayerWithSimpleUser[]> {
    const { data: simpleUsers } = await fetchSimpleUser();
    const { data: players } = await supabase.schema('games').from('players').select('*');

    return _(players) // start sequence
      .keyBy('player') // create a dictionary of the 1st array
      .merge(_.keyBy(simpleUsers, 'id')) // create a dictionary of the 2nd array, and merge it to the 1st
      .values() // turn the combined dictionary to array
      .value()
      .map((x) => (({
        ...x,
      }) as PlayerWithSimpleUser))
      .sort((x, y) => x.name.localeCompare(y.name));
  },

  async reportScores(
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
    event?: string
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
      })
      .throwOnError();
  },
};
