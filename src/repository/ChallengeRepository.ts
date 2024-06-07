import {supabase} from "../components/services/supabase/supabaseClient";
import {FullChallenge} from "../types/supabaseTypes";
import {PostgrestSingleResponse} from "@supabase/supabase-js";

export const ChallengeRepository = {
    async fetchChallenges(): Promise<PostgrestSingleResponse<FullChallenge[]>> {
        return supabase
            .from("challenge")
            .select("*, stats: challenge_stats (*, user: user(*))")
            .throwOnError()
            .returns<FullChallenge[]>();
    },

    async fetchChallengeStats(id: string): Promise<PostgrestSingleResponse<FullChallenge>> {
        return supabase
            .from("challenge")
            .select("*, stats: challenge_stats (*, user: user(*))")
            .eq("challenge", id)
            .throwOnError()
            .returns<FullChallenge>()
            .single();
    },

    async increasePointForUser(userId: string) {
        return supabase
            .rpc("increase_challenge_stats_count", {user_id: userId, amount: 1})
            .throwOnError();
    }
}