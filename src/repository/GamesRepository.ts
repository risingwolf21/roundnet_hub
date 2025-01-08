import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "src/components/services/supabase/supabaseClient"

export const fetchUserMatches = () => supabase
    .schema("games")
    .from("user_matches")
    .select("*, team_a_player_1: players!team_a_player_1(*), team_a_player_2: players!team_a_player_2(*), team_b_player_1: players!team_b_player_1(*), team_b_player_2: players!team_b_player_2(*)")

export const GamesRepository = {
    async fetchGamesForUser(): Promise<PostgrestSingleResponse<FullUserMatch[]>> {
        return fetchUserMatches();
    },

    async reportScores(sets: { team_a_score: number, team_b_score: number }[], player_1a: string, player_1b: string, player_2a: string, player_2b: string, team_a: string, team_b: string): Promise<PostgrestSingleResponse<undefined>> {
        return supabase.rpc("add_match_with_sets", { match_sets: JSON.stringify(sets), player_1a, player_1b, player_2a, player_2b, team_a, team_b })
    }
}