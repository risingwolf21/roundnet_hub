import {supabase} from "../components/services/supabase/supabaseClient";
import {ChallengeStatWithUser, FullChallenge} from "../types/supabaseTypes";
import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {formatDateToDatabase} from "../utils";

export const ChallengeRepository = {
    async fetchChallenges(): Promise<PostgrestSingleResponse<Challenge[]>> {
        return supabase
            .from("challenge")
            .select("*")
            .or(`end_date.is.null,end_date.gt.'${formatDateToDatabase(new Date())}'`)
            .order("name")
            .throwOnError()
            .returns<Challenge[]>();
    },

    async fetchArchivedChallenges(): Promise<PostgrestSingleResponse<Challenge[]>> {
        return supabase
            .from("challenge")
            .select("*")
            .not("end_date", "is", null)
            .lt("end_date", formatDateToDatabase(new Date()))
            .order("end_date")
            .throwOnError()
            .returns<Challenge[]>();
    },

    async fetchChallengeStats(id: string): Promise<PostgrestSingleResponse<FullChallenge>> {
        return supabase
            .from("challenge")
            .select("*, stats: challenge_stats (*, user: user(*))")
            .eq("id", id)
            .throwOnError()
            .returns<FullChallenge>()
            .single();
    },

    async fetchChallengeStatsSingle(challenge_id: number, user_id: string): Promise<PostgrestSingleResponse<ChallengeStatWithUser>> {
        return supabase
            .from("challenge_stats")
            .select("*, user: user(*)")
            .eq("challenge", challenge_id)
            .eq("user.userId", user_id)
            .throwOnError()
            .returns<ChallengeStatWithUser>()
            .single();
    },

    async increasePointForUser(userId: string, challenge: number) {
        return supabase
            .rpc("increase_challenge_stats_count", {user_id: userId, amount: 1, challenge_id: challenge})
            .throwOnError();
    }
}