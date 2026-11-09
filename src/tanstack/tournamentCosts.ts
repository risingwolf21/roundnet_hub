import { queryClient } from '@/lib/queryClient';
import {
  TournamentCostInsert,
  TournamentCostRepository,
  TournamentCostRow,
  TournamentCostUpdate,
} from '@/repository/TournamentCostRepository';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';

export const costKeys = {
  all: ['tournamentCosts'] as const,
  byUser: (userId: string) => [...costKeys.all, userId] as const,
};

export const useTournamentCosts = (userId: string | undefined) =>
  useQuery<TournamentCostRow[]>({
    queryKey: costKeys.byUser(userId!),
    enabled: !!userId,
    queryFn: () => TournamentCostRepository.fetchAll(userId!),
    staleTime: 2 * 60 * 1000,
  });

export const useAddCostMutation = (userId: string) =>
  useMutation({
    mutationFn: (row: TournamentCostInsert) => TournamentCostRepository.insert(userId, row),
    onMutate: async (row) => {
      await queryClient.cancelQueries({ queryKey: costKeys.byUser(userId) });
      const previous = queryClient.getQueryData<TournamentCostRow[]>(costKeys.byUser(userId));
      const optimistic: TournamentCostRow = {
        id: crypto.randomUUID(),
        user_id: userId,
        created_at: new Date().toISOString(),
        ...row,
      };
      queryClient.setQueryData<TournamentCostRow[]>(costKeys.byUser(userId), (old = []) => [
        optimistic,
        ...old,
      ]);
      return { previous };
    },
    onError: (error, _vars, context) => {
      captureException(error, { tags: { type: 'AddTournamentCost', scope: 'costs' } });
      if (context?.previous) {
        queryClient.setQueryData(costKeys.byUser(userId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: costKeys.byUser(userId) });
    },
  });

export const useUpdateCostMutation = (userId: string) =>
  useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TournamentCostUpdate }) =>
      TournamentCostRepository.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: costKeys.byUser(userId) });
      const previous = queryClient.getQueryData<TournamentCostRow[]>(costKeys.byUser(userId));
      queryClient.setQueryData<TournamentCostRow[]>(costKeys.byUser(userId), (old = []) =>
        old.map((c) => (c.id === id ? { ...c, ...patch } : c))
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      captureException(error, { tags: { type: 'UpdateTournamentCost', scope: 'costs' } });
      if (context?.previous) {
        queryClient.setQueryData(costKeys.byUser(userId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: costKeys.byUser(userId) });
    },
  });

export const useDeleteCostMutation = (userId: string) =>
  useMutation({
    mutationFn: (id: string) => TournamentCostRepository.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: costKeys.byUser(userId) });
      const previous = queryClient.getQueryData<TournamentCostRow[]>(costKeys.byUser(userId));
      queryClient.setQueryData<TournamentCostRow[]>(costKeys.byUser(userId), (old = []) =>
        old.filter((c) => c.id !== id)
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      captureException(error, { tags: { type: 'DeleteTournamentCost', scope: 'costs' } });
      if (context?.previous) {
        queryClient.setQueryData(costKeys.byUser(userId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: costKeys.byUser(userId) });
    },
  });
