import { queryClient } from '@/lib/queryClient';
import { ChallengeRepository } from '@/repository/ChallengeRepository';
import { TablesInsert, TablesUpdate } from '@/types/supabase-generated.types';
import { ChallengePointsView, ChallengeStatWithUser } from '@/types/supabaseTypes';
import { dataURLtoFile, formatSafeDateToDatabase } from '@/utils';
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
    queryFn: ({ pageParam }) => ChallengeRepository.fetchInfiniteChallengeStats(challengeId, count, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

export const useChallengeLeaderboard = (challengeId: string) =>
  useQuery({
    queryKey: challengeKeys.challengeLeaderboard(challengeId),
    queryFn: () => ChallengeRepository.fetchLeaderboard(challengeId),
  });

export const useChallenge = (challengeId: string) =>
  useQuery<Challenge | null>({
    queryKey: challengeKeys.challengeInformation(challengeId),
    queryFn: () => ChallengeRepository.fetchChallenge(challengeId),
  });

export const useChallenges = () =>
  useQuery({
    queryKey: challengeKeys.list(),
    queryFn: () => ChallengeRepository.fetchActiveChallenges(),
  });

export const useChallengePodiums = () =>
  useQuery({
    queryKey: [...challengeKeys.all, 'podiums'] as const,
    queryFn: () => ChallengeRepository.fetchPodiums(),
  });

export const useArchivedChallenges = () =>
  useInfiniteQuery({
    queryKey: challengeKeys.archivedList(),
    queryFn: ({ pageParam = 0 }: { pageParam?: number }) =>
      ChallengeRepository.fetchArchivedChallenges(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

export const useChallengeStatsForUser = (challengeId: string, user: User) =>
  useQuery<ChallengeStats[]>({
    queryKey: challengeKeys.challengeStatsForUser(challengeId, user.id),
    queryFn: () => ChallengeRepository.fetchStatsForUser(challengeId, user.id),
  });

export const useIncreasePointForUserMutation = (challengeId: string) =>
  useMutation({
    meta: { suppressErrorToast: true },
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
        const { data: uploadData, error } = await ChallengeRepository.uploadImage(
          challenge,
          image.fileName,
          dataURLtoFile(image.dataUrl, image.fileName)
        );

        if (uploadData?.path && !error) {
          image_url = ChallengeRepository.getImageUrl(uploadData.path);
        }
      }

      const result = await ChallengeRepository.increasePointForUser({
        challenge,
        created_at,
        image_url,
        amount: count,
        category,
        comment,
      });

      return { serverRow: result.data, image_url, imageFailedToUpload: !!image && !image_url };
    },
    onMutate: async ({ user, count, challenge, created_at, image, category, comment }) => {
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
          meta: {
            category,
            comment,
          },
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
    meta: { suppressErrorToast: true },
    mutationFn: async ({ challenge }: { challenge: TablesUpdate<'challenge'> }) => {
      return ChallengeRepository.updateChallenge(challenge);
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
    meta: { suppressErrorToast: true },
    mutationFn: async (challenge: TablesInsert<'challenge'>) => {
      return ChallengeRepository.insertChallenge(challenge);
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
