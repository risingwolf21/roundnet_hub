import { InfiniteData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { fetchChallengeWithGroup } from '@/repository/ChallengeRepository';
import { ChallengePointsView, ChallengeStatWithUser } from '@/types/supabaseTypes';
import { formatDateToDatabase, formatSafeDateToDatabase } from '@/utils';

export const useInfiniteChallengeStats = (challengeId: string, count: number = 20) =>
  useInfiniteQuery({
    queryKey: ['challenge', challengeId, 'stats'],
    queryFn: async ({ pageParam }) => {
      const { data } = await supabase
        .schema('public')
        .from('challenge_stats')
        .select('*, fullUser: user(*)')
        .eq('challenge', challengeId)
        .range(pageParam * count, pageParam * count + count - 1)
        .order('created_at', { ascending: false })
        .throwOnError();

      const hasMore = (data?.length ?? 0) === count;

      return {
        data: data ?? [],
        nextPage: hasMore ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

export const useChallengeLeaderboard = (challengeId: string) =>
  useQuery({
    queryKey: ['challenge', challengeId, 'leaderboard'],
    queryFn: async () => {
      const result = await supabase
        .from('challenge_user_points')
        .select('*')
        .eq('challenge', challengeId)
        .returns<ChallengePointsView[]>()
        .throwOnError();

      return result.data ?? [];
    },
  });

export const useChallenge = (challengeId: string) =>
  useQuery<Challenge | null>({
    queryKey: ['challenge', challengeId],
    queryFn: async () => {
      const result = await supabase.from('challenge').select('*').eq('id', challengeId).maybeSingle().throwOnError();

      return result.data;
    },
  });

export const useChallenges = () =>
  useQuery<ChallengeWithFullGroup[]>({
    queryKey: ['challenges'],
    queryFn: async () => {
      const { data } = await fetchChallengeWithGroup()
        .or(`end_date.is.null,end_date.gt.'${formatDateToDatabase(new Date())}'`)
        .order('name')
        .throwOnError()
        .returns<ChallengeWithFullGroup[]>();

      return data ?? [];
    },
  });

export const useArchivedChallenges = () =>
  useInfiniteQuery({
    queryKey: ['challenges', 'archived'],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
      const { data } = await fetchChallengeWithGroup()
        .not('end_date', 'is', null)
        .lt('end_date', formatDateToDatabase(new Date()))
        .order('end_date', { ascending: false })
        .throwOnError()
        .returns<ChallengeWithFullGroup[]>();

      const hasMore = (data?.length ?? 0) === 20;

      return {
        data: data ?? [],
        nextPage: hasMore ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

export const useChallengeStatsForUser = (challengeId: string, userId: string) =>
  useQuery<ChallengeStats[]>({
    queryKey: ['challenge', challengeId, 'stats', userId],
    queryFn: async () => {
      const result = await supabase
        .from('challenge_stats')
        .select('*')
        .eq('challenge', challengeId)
        .eq('user', userId)
        .throwOnError();

      return result.data ?? [];
    },
  });

export const useIncreasePointForUserMutation = (challengeId: string) =>
  useMutation({
    mutationFn: async ({
      challenge,
      created_at,
      image_url,
    }: {
      user: User;
      challenge: string;
      created_at: Date;
      image_url: string | null;
    }) => {
      const result = await supabase
        .rpc('increase_challenge_stats_count', {
          amount: 1,
          challenge_id: challenge,
          to_create_at: formatDateToDatabase(created_at)!,
          image_url: image_url ?? '',
        })
        .throwOnError();

      return result.data;
    },
    onMutate: async ({ user, challenge, created_at, image_url }) => {
      await queryClient.cancelQueries({ queryKey: ['challenge', challengeId] });

      const previousStats = queryClient.getQueryData<InfiniteData<ChallengeStatWithUser[]>>([
        'challenge',
        challengeId,
        'stats',
      ]);
      const previousLeaderboard = queryClient.getQueryData<ChallengePointsView[]>([
        'challenge',
        challengeId,
        'leaderboard',
      ]);
      const previousStatsForUser = queryClient.getQueryData<ChallengeStats[]>([
        'challenge',
        challengeId,
        'stats',
        user.userId,
      ]);

      if (previousStats) {
        const newStat = {
          challenge: challenge,
          count: 1,
          created_at: formatSafeDateToDatabase(created_at),
          image_url: image_url,
          user: user.userId,
          id: -1,
          fullUser: user,
        } as ChallengeStatWithUser;
        const newStats: InfiniteData<ChallengeStatWithUser[]> =
          previousStats.pages.length === 0
            ? {
                ...previousStats,
                pages: [[newStat]],
              }
            : {
                ...previousStats,
                pages: previousStats.pages.map((x, index) => (index === 0 && Array.isArray(x) ? [...x, newStat] : x)),
              };

        queryClient.setQueryData<InfiniteData<ChallengeStatWithUser[]>>(['challenge', challengeId, 'stats'], newStats);
      }
      if (previousLeaderboard) {
        const newLeaderBoard = previousLeaderboard.map((x) => {
          if (x.user === user.userId) {
            return {
              ...x,
              total_points: x.total_points + 1,
            };
          }
          return x;
        });
        queryClient.setQueryData<ChallengePointsView[]>(['challenge', challengeId, 'leaderboard'], newLeaderBoard);
      }
      if (previousStatsForUser) {
        const newStatsForUser = [
          ...previousStatsForUser,
          {
            challenge: challenge,
            count: 1,
            created_at: formatSafeDateToDatabase(created_at),
            image_url: image_url,
            user: user.userId,
          },
        ] as ChallengeStats[];
        queryClient.setQueryData<ChallengeStats[]>(['challenge', challengeId, 'stats', user.userId], newStatsForUser);
      }

      return { previousLeaderboard, previousStats, previousStatsForUser };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLeaderboard) {
        queryClient.setQueryData(['challenge', challengeId, 'leaderboard'], context.previousLeaderboard);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(['challenge', challengeId, 'stats'], context.previousStats);
      }
      if (context?.previousStatsForUser) {
        queryClient.setQueryData(['challenge', challengeId, 'stats', _vars.user.userId], context.previousStatsForUser);
      }
    },
    onSettled: (_data, _error, variables, _context) => {
      queryClient.invalidateQueries({ queryKey: ['challenge', challengeId, 'leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['challenge', challengeId, 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['challenge', challengeId, 'stats', variables.user.userId] });
    },
  });
