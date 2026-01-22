import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { SupabaseKeysRepository } from '@/repository/KeysRepository';
import { TablesInsert, TablesUpdate } from '@/types/supabase-generated.types';
import { formatDateToDatabase } from '@/utils';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';

export const itemKeys = {
  all: ['items'] as const,
  list: () => [...itemKeys.all, 'list'] as const,
  item: (itemId: number) => [...itemKeys.all, itemId] as const,
  history: (itemId: number) => [...itemKeys.item(itemId), 'history'] as const,
};

export const useAllItems = () =>
  useQuery<FullItemHolder[]>({
    queryKey: itemKeys.list(),
    queryFn: () => SupabaseKeysRepository.getItems(),
  });

export const useItemHistory = (id: number) =>
  useQuery<FullItemHistory[]>({
    queryKey: itemKeys.history(id),
    queryFn: () => SupabaseKeysRepository.loadKeyHistory(id),
  });

export const useHandoverKeyMutation = () =>
  useMutation({
    mutationFn: async ({ keyHolder, user }: { keyHolder: FullItemHolder; user: User }) => {
      return SupabaseKeysRepository.giveItemToUser(keyHolder, user);
    },
    onMutate: async ({ keyHolder, user }) => {
      await queryClient.cancelQueries({ queryKey: itemKeys.list() });
      await queryClient.cancelQueries({ queryKey: itemKeys.history(keyHolder.id) });

      const previousItemHolders = queryClient.getQueryData<FullItemHolder[]>(itemKeys.list());
      const previousItemHistory = queryClient.getQueryData<FullItemHistory[]>(itemKeys.history(keyHolder.id));
      if (previousItemHolders) {
        const newItemHolders = previousItemHolders.map((x) => {
          if (x.full_current_holder?.id === keyHolder.full_current_holder?.id) {
            return {
              ...keyHolder,
              full_current_holder: user,
              current_holder: user.id,
              lastUpdate: formatDateToDatabase(new Date()),
            };
          } else {
            return x;
          }
        });
        queryClient.setQueryData<FullItemHolder[]>(itemKeys.list(), newItemHolders);
      }

      if (previousItemHistory) {
        const newItemHistory = [
          ...previousItemHistory,
          {
            created_at: formatDateToDatabase(new Date()),
            currentUser: user,
            key: {
              ...keyHolder,
            },
            pastUser: keyHolder.full_current_holder,
          },
        ] as FullItemHistory[];
        queryClient.setQueryData<FullItemHistory[]>(itemKeys.history(keyHolder.id), newItemHistory);
      }

      return { previousItemHolders, previousItemHistory, itemId: keyHolder.id };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'HandoverKey', scope: 'items' },
      });
      if (context?.previousItemHolders) {
        queryClient.setQueryData(itemKeys.list(), context.previousItemHolders);
      }
      if (context?.previousItemHistory && context?.itemId) {
        queryClient.setQueryData(itemKeys.history(context.itemId), context.previousItemHistory);
      }
    },
    onSettled: (_d, _e, _v, context) => {
      queryClient.invalidateQueries({ queryKey: itemKeys.list() });
      if (context?.itemId) {
        queryClient.invalidateQueries({ queryKey: itemKeys.history(context.itemId) });
      }
    },
  });

export const useUpdateItemMutation = () =>
  useMutation({
    mutationFn: async ({ item }: { item: TablesUpdate<'items'> & { id: number } }) => {
      const result = await supabase
        .rpc('edit_item', {
          p_color: item.color,
          p_id: item.id,
          p_name: item.name,
          p_type: item.type,
        })
        .throwOnError();

      return result.data;
    },
    onMutate: async ({ item }) => {
      await queryClient.cancelQueries({ queryKey: itemKeys.list() });

      const previousItemHolders = queryClient.getQueryData<FullItemHolder[]>(itemKeys.list());

      if (previousItemHolders) {
        const newItemHolders = previousItemHolders.map((x) => {
          if (x.id === item.id) {
            return {
              ...x,
              ...item,
              id: item.id,
            };
          } else {
            return x;
          }
        });
        queryClient.setQueryData<FullItemHolder[]>(itemKeys.list(), newItemHolders);
      }

      return { previousItemHolders };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'UpdateItem', scope: 'items' },
      });
      if (context?.previousItemHolders) {
        queryClient.setQueryData(itemKeys.list(), context.previousItemHolders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.list() });
    },
  });

export const useInsertItemMutation = () =>
  useMutation({
    mutationFn: async ({ item }: { item: TablesInsert<'items'> }) => {
      const result = await supabase.from('items').insert(item).select().single().throwOnError();

      return result.data;
    },
    onMutate: async ({ item }) => {
      await queryClient.cancelQueries({ queryKey: itemKeys.list() });

      const previousItemHolders = queryClient.getQueryData<FullItemHolder[]>(itemKeys.list());

      if (previousItemHolders) {
        const newItemHolders = [
          ...previousItemHolders,
          {
            ...item,
          },
        ] as FullItemHolder[];
        queryClient.setQueryData<FullItemHolder[]>(itemKeys.list(), newItemHolders);
      }

      return { previousItemHolders };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'InsertItem', scope: 'items' },
      });
      if (context?.previousItemHolders) {
        queryClient.setQueryData(itemKeys.list(), context.previousItemHolders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.list() });
    },
  });
