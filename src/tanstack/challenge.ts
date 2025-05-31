import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { ChallengePointsView } from "src/types/supabaseTypes";

export const useInfiniteChallengeStats = (challengeId: string, count: number = 20) => useInfiniteQuery({
  queryKey: ["challenge", challengeId, "stats"],
  queryFn: async ({ pageParam }) => {
    const { data } = await supabase
      .schema("public")
      .from("challenge_stats")
      .select("*, fullUser: user(*)")
      .eq('challenge', challengeId)
      .range(pageParam * count, pageParam * count + count - 1)
      .order('created_at', { ascending: false })
      .throwOnError();

    const hasMore = (data?.length ?? 0) === count

    return {
      data: data ?? [],
      nextPage: hasMore ? pageParam + 1 : undefined,
    }
  },
  getNextPageParam: (lastPage) => lastPage.nextPage,
  initialPageParam: 0
});

export const useChallengeLeaderboard = (challengeId: string) => useQuery({
  queryKey: ["challenge", challengeId, "leaderboard"],
  queryFn: async () => {
    const result = await supabase
      .from("challenge_user_points")
      .select("*")
      .eq("challenge", challengeId)
      .returns<ChallengePointsView[]>()
      .throwOnError();

    return result.data ?? [];
  }
})

export const useChallenge = (challengeId: string) => useQuery<Challenge | null>({
  queryKey: ["challenge", challengeId],
  queryFn: async () => {
    const result = await supabase
      .from("challenge")
      .select("*")
      .eq("id", challengeId)
      .maybeSingle()
      .throwOnError();

    return result.data;
  }
})

export const useChallengeStatsForUser = (challengeId: string, userId: string) => useQuery<ChallengeStats[]>({
  queryKey: ["challenge", challengeId, "stats", userId],
  queryFn: async () => {
    const result = await supabase
      .from("challenge_stats")
      .select("*")
      .eq("challenge", challengeId)
      .eq("user", userId)
      .throwOnError();

    return result.data ?? [];
  }
})