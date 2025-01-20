import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { fetchSimpleUser } from './UserRepository';
import _ from 'lodash';

export const fetchUserMatches = () =>
    supabase
        .schema('games')
        .from('user_matches')
        .select(
            '*, team_a_player_1: players!team_a_player_1(*), team_a_player_2: players!team_a_player_2(*), team_b_player_1: players!team_b_player_1(*), team_b_player_2: players!team_b_player_2(*)'
        )
        .order('created_at', { ascending: false });

export const GamesRepository = {
    async fetchGamesForUser(): Promise<PostgrestSingleResponse<FullUserMatch[]>> {
        return fetchUserMatches();
    },

    async fetchAvailablePlayers(): Promise<PlayerWithSimpleUser[]> {
        const { data: simpleUsers } = await fetchSimpleUser();
        const { data: players } = await supabase.schema('games').from('players').select('*');

        return _(players) // start sequence
            .keyBy('player') // create a dictionary of the 1st array
            .merge(_.keyBy(simpleUsers, 'userId')) // create a dictionary of the 2nd array, and merge it to the 1st
            .values() // turn the combined dictionary to array
            .value()
            .map((x) => ({ ...x }) as PlayerWithSimpleUser)
            .sort((x, y) => x.name.localeCompare(y.name))
    },

    async reportScores(
        sets: { team_a_score: number; team_b_score: number }[],
        player_1a: string,
        player_1b: string,
        player_2a: string,
        player_2b: string,
        team_a: string,
        team_b: string
    ): Promise<PostgrestSingleResponse<undefined>> {
        return supabase
            .schema('games')
            .rpc('add_match_with_sets', {
                match_sets: sets.map((x) => ({ team_a_score: x.team_a_score, team_b_score: x.team_b_score })),
                player_1a,
                player_1b,
                player_2a,
                player_2b,
                team_a,
                team_b,
            })
            .throwOnError();
    },
};
