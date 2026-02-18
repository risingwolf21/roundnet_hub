import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { fetchChallengeWithGroup } from '@/repository/ChallengeRepository';
import { TablesInsert, TablesUpdate } from '@/types/supabase-generated.types';
import { ChallengePointsView, ChallengeStatWithUser } from '@/types/supabaseTypes';
import { dataURLtoFile, formatDateToDatabase, formatSafeDateToDatabase } from '@/utils';
import { captureException } from '@sentry/react';
import { InfiniteData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

export const challengeKeys = {
  all: ['challenge'] as const,
  list: () => [...challengeKeys.all, 'list'] as const,
  archivedList: () => [...challengeKeys.all, 'archived'] as const,
  challengeLeaderboard: (id: string) => [...challengeKeys.all, id, 'leaderboard'] as const,
  challengeStats: (id: string) => [...challengeKeys.all, id, 'stats'] as const,
  challengeStatsForUser: (id: string, userId: string) => [...challengeKeys.all, id, 'stats', userId] as const,
  challengeInformation: (id: string) => [...challengeKeys.all, id] as const,
};

export const useInfiniteChallengeStats = (challengeId: string, count: number = 20) =>
  useInfiniteQuery({
    queryKey: challengeKeys.challengeStats(challengeId),
    queryFn: async ({ pageParam }) => {
      const { data } = await supabase
        .schema('public')
        .from('challenge_stats')
        .select('*, fullUser: user(*), meta: challenge_stats_meta(*)')
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
    queryKey: challengeKeys.challengeLeaderboard(challengeId),
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
    queryKey: challengeKeys.challengeInformation(challengeId),
    queryFn: async () => {
      const result = await supabase.from('challenge').select('*').eq('id', challengeId).maybeSingle().throwOnError();

      return result.data;
    },
  });

export const useChallenges = () =>
  useQuery<ChallengeWithFullGroup[]>({
    queryKey: challengeKeys.list(),
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
    queryKey: challengeKeys.archivedList(),
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

export const useChallengeStatsForUser = (challengeId: string, user: User) =>
  useQuery<ChallengeStats[]>({
    queryKey: challengeKeys.challengeStatsForUser(challengeId, user.id),
    queryFn: async () => {
      const result = await supabase
        .from('challenge_stats')
        .select('*')
        .eq('challenge', challengeId)
        .eq('user', user.id)
        .throwOnError();

      return result.data ?? [];
    },
  });

export const useIncreasePointForUserMutation = (challengeId: string) =>
  useMutation({
    mutationFn: async ({
      challenge,
      created_at,
      image,
      count,
      comment,
      category,
    }: {
      user: User;
      challenge: string;
      created_at: Date;
      image: { dataUrl: string; fileName: string } | null;
      count: number;
      comment?: string;
      category?: string;
    }) => {
      let image_url: string | null = null;

      if (image) {
        const { data: uploadData, error } = await supabase.storage
          .from('challenge')
          .upload(`${challenge}/${image.fileName}`, dataURLtoFile(image.dataUrl, image.fileName), { upsert: true });

        if (uploadData?.path && !error) {
          const { data } = supabase.storage.from('challenge').getPublicUrl(uploadData.path);
          image_url = data?.publicUrl ?? null;
        }
      }

      const result = await supabase
        .rpc('increase_challenge_stats_count', {
          amount: count,
          challenge_id: challenge,
          to_create_at: formatDateToDatabase(created_at)!,
          image_url: image_url ?? '',
          category,
          comment,
        })
        .throwOnError();

      return { serverRow: result.data, image_url, imageFailedToUpload: !!image && !image_url };
    },
    onMutate: async ({ user, count, challenge, created_at, image }) => {
      const challengeStatId = Date.now();
      await queryClient.cancelQueries({ queryKey: challengeKeys.challengeInformation(challengeId) });
      await queryClient.cancelQueries({ queryKey: challengeKeys.challengeLeaderboard(challengeId) });
      await queryClient.cancelQueries({ queryKey: challengeKeys.challengeStatsForUser(challengeId, user.id) });

      const previousStats = queryClient.getQueryData<InfiniteData<ChallengeStatWithUser[]>>(
        challengeKeys.challengeStats(challengeId)
      );
      const previousLeaderboard = queryClient.getQueryData<ChallengePointsView[]>(
        challengeKeys.challengeLeaderboard(challengeId)
      );
      const previousStatsForUser = queryClient.getQueryData<ChallengeStats[]>(
        challengeKeys.challengeStatsForUser(challengeId, user.id)
      );

      if (previousStats) {
        const newStat = {
          challenge: challenge,
          count: count,
          created_at: formatSafeDateToDatabase(created_at),
          image_url: image?.dataUrl ?? null,
          user: user.id,
          id: -1,
          fullUser: user,
        } as ChallengeStatWithUser;

        queryClient.setQueryData<InfiniteData<{ data: ChallengeStatWithUser[]; nextPage: number | undefined }>>(
          challengeKeys.challengeStats(challengeId),
          (old) => {
            if (!old || old.pages.length === 0) {
              return {
                pages: [{ data: [newStat], nextPage: undefined }],
                pageParams: [undefined],
              };
            }

            const [first, ...rest] = old.pages;
            return {
              pages: [{ ...first, data: [newStat, ...first.data] }, ...rest],
              pageParams: old.pageParams,
            };
          }
        );
      }

      if (previousLeaderboard) {
        const newLeaderBoard = previousLeaderboard.map((x) => {
          if (x.user === user.id) {
            return {
              ...x,
              total_points: x.total_points + count,
            };
          }
          return x;
        });
        queryClient.setQueryData<ChallengePointsView[]>(
          challengeKeys.challengeLeaderboard(challengeId),
          newLeaderBoard
        );
      }
      if (previousStatsForUser) {
        const newStatsForUser = [
          ...previousStatsForUser,
          {
            challenge: challenge,
            count: count,
            created_at: formatSafeDateToDatabase(created_at),
            image_url: image?.dataUrl ?? null,
            user: user.id,
          },
        ] as ChallengeStats[];
        queryClient.setQueryData<ChallengeStats[]>(
          challengeKeys.challengeStatsForUser(challengeId, user.id),
          newStatsForUser
        );
      }

      return { previousLeaderboard, previousStats, previousStatsForUser, tempId: challengeStatId };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...error,
          userId: variables.user.id,
          userName: variables.user.name,
          challengeId: variables.challenge,
        },
        tags: { type: 'IncreaseChallengePoint', scope: 'challenge' },
      });
      if (context?.previousLeaderboard) {
        queryClient.setQueryData(challengeKeys.challengeLeaderboard(challengeId), context.previousLeaderboard);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(challengeKeys.challengeStats(challengeId), context.previousStats);
      }
      if (context?.previousStatsForUser) {
        queryClient.setQueryData(
          challengeKeys.challengeStatsForUser(challengeId, variables.user.id),
          context.previousStatsForUser
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: challengeKeys.challengeLeaderboard(challengeId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.challengeStats(challengeId) });
      queryClient.invalidateQueries({ queryKey: challengeKeys.challengeStatsForUser(challengeId, variables.user.id) });
    },
  });

export const useUpdateChallengeMutation = () =>
  useMutation({
    mutationFn: async ({ challenge }: { challenge: TablesUpdate<'challenge'> }) => {
      const result = await supabase
        .from('challenge')
        .update(challenge)
        .eq('id', challenge.id ?? '')
        .throwOnError();

      console.log(result);

      return result.data;
    },
    onMutate: async ({ challenge }) => {
      const previousChallenge = queryClient.getQueryData<Challenge>(challengeKeys.challengeInformation(challenge.id!));

      if (previousChallenge) {
        const newChallenge = {
          ...previousChallenge,
          ...challenge,
        };
        queryClient.setQueryData<Challenge>(challengeKeys.challengeInformation(challenge.id!), newChallenge);
      }

      return { previousChallenge };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...error,
          ...variables,
        },
        tags: { type: 'UpdateChallenge', scope: 'challenge' },
      });
      if (context?.previousChallenge && variables.challenge.id) {
        queryClient.setQueryData(challengeKeys.challengeInformation(variables.challenge.id), context.previousChallenge);
      }
    },
    onSettled: (_data, _error, variables) => {
      if (variables.challenge.id) {
        queryClient.invalidateQueries({ queryKey: challengeKeys.challengeInformation(variables.challenge.id) });
      }
      queryClient.invalidateQueries({ queryKey: challengeKeys.list() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.archivedList() });
    },
  });

export const useInsertChallengeMutation = () =>
  useMutation({
    mutationFn: async (challenge: TablesInsert<'challenge'>) => {
      const result = await supabase
        .from('challenge')
        .insert({
          automated: challenge.automated,
          name: challenge.name,
          description: challenge.description,
          end_date: challenge.end_date,
          max_points_per_day: challenge.max_points_per_day,
          max_points_per_week: challenge.max_points_per_week,
          group: challenge.group,
          comments_enabled: challenge.comments_enabled,
          category_enabled: challenge.category_enabled,
          show_all_members: challenge.show_all_members,
        })
        .select('*')
        .single()
        .throwOnError();

      return result.data;
    },
    onError: (error, variables) => {
      captureException(error, {
        extra: {
          ...error,
          ...variables,
        },
        tags: { type: 'UpsertChallenge', scope: 'challenge' },
      });
    },
    onSettled: (_data, _error, variables) => {
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: challengeKeys.challengeInformation(variables.id) });
      }
      queryClient.invalidateQueries({ queryKey: challengeKeys.list() });
      queryClient.invalidateQueries({ queryKey: challengeKeys.archivedList() });
    },
  });
