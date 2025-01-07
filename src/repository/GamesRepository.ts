import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "src/components/services/supabase/supabaseClient"

export const fetchUserMatches = () => supabase
    .schema("games")
    .from("user_matches")
    .select("*, team_a_player_1: players!team_a_player_1(*), team_a_player_2: players!team_a_player_2(*), team_b_player_1: players!team_b_player_1(*), team_b_player_2: players!team_b_player_2(*)")

export const GamesRepository = {
    async fetchGamesForUser(): Promise<PostgrestSingleResponse<FullUserMatch[]>> {
        return fetchUserMatches();
    }
}