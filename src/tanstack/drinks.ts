import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { fetchFullHistory } from '@/repository/DrinkRepository';
import { DrinkCounter, PaymentHistory } from '@/types/supabaseTypes';
import { captureException } from '@sentry/react';
import { InfiniteData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

export const drinkKeys = {
  all: ['drink'] as const,
  allAdmin: ['admin', 'drink'] as const,
  list: () => [...drinkKeys.all, 'list'] as const,
  listAdmin: () => [...drinkKeys.allAdmin, 'list'] as const,
  paymentHistory: (userId: string) => [...drinkKeys.all, 'payment', userId] as const,
  vouchers: () => [...drinkKeys.all, 'vouchers'] as const,
  drinks: () => [...drinkKeys.all, 'drinks'] as const,
  userHistory: (userId: string) => [...drinkKeys.all, 'history', userId] as const,
};

export const useAllDrinksAsAdmin = () =>
  useQuery<Drink[]>({
    queryKey: drinkKeys.listAdmin(),
    queryFn: async () => {
      const result = await supabase.from('drink').select('*');
      return result.data ?? [];
    },
  });

export const usePaymentHistory = (userId: string) =>
  useQuery({
    queryKey: drinkKeys.paymentHistory(userId),
    queryFn: async () => {
      const result = await supabase
        .from('history')
        .select('*, drink ( id, name, price ), payments ( paymentState ), voucher')
        .eq('payments.paymentState', 'Open')
        .not('payments', 'is', null)
        .eq('user', userId)
        .returns<PaymentHistory[]>()
        .throwOnError();

      return result.data ?? [];
    },
  });

export const useVouchers = () =>
  useQuery({
    queryKey: drinkKeys.vouchers(),
    queryFn: async () => {
      const result = await supabase.from('user_vouchers').select('*').throwOnError();

      return result.data ?? [];
    },
  });

export const useDrinks = () =>
  useQuery({
    queryKey: drinkKeys.drinks(),
    queryFn: async () => {
      const result = await supabase
        .from('drink')
        .select('*')
        .order('id', { ascending: false })
        .returns<Drink[]>()
        .throwOnError();

      return result.data ?? [];
    },
  });

export const useInfiniteUserHistory = (userId: string, count: number = 20) =>
  useInfiniteQuery({
    queryKey: drinkKeys.userHistory(userId),
    queryFn: async ({ pageParam }) => {
      const { data } = await fetchFullHistory()
        .not('user', 'is', null)
        .eq('user.id', userId)
        .range(pageParam * count, pageParam * count + count - 1)
        .order('created_at', { ascending: false })
        .returns<FullHistory[]>()
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

export const useInsertHistoryEntryMutation = (user: User) => {
  return useMutation({
    mutationFn: async ({ drinks }: { drinks: DrinkCounter[] }) => {
      const drinksToAdd = drinks.map((x) => ({ id: x.id, count: x.count, price: x.price }));
      return supabase.rpc('add_drinks_history', { items: drinksToAdd }).throwOnError();
    },
    onError: (error, variables) => {
      captureException(error, {
        extra: {
          ...error,
          userId: user.id,
          userName: user.name,
          drinks: variables.drinks,
        },
        tags: { type: 'InsertHistoryError', scope: 'drinks' },
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: drinkKeys.userHistory(user.id) });
      queryClient.invalidateQueries({ queryKey: drinkKeys.paymentHistory(user.id) });
    },
  });
};

export const useUpdateHistoryEntryMutation = (user: User) =>
  useMutation({
    mutationFn: async (newEntry: FullHistory) => {
      const result = await supabase
        .from('history')
        .update({ count: newEntry.count, amount: newEntry.amount })
        .eq('id', newEntry.id)
        .throwOnError();
      return result.data;
    },
    onMutate: async (newEntry: FullHistory) => {
      await queryClient.cancelQueries({ queryKey: drinkKeys.userHistory(user.id) });
      const previousHistory = queryClient.getQueryData<InfiniteData<FullHistory[]>>(drinkKeys.userHistory(user.id));

      if (previousHistory) {
        const newHistory = {
          ...previousHistory,
          pages: previousHistory.pages.map((page) =>
            page.map((history) => (history.id === newEntry.id ? newEntry : history))
          ),
        };
        queryClient.setQueryData<InfiniteData<FullHistory[]>>(drinkKeys.userHistory(user.id), newHistory);
      }
      return { previousHistory };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...error,
          userId: user.id,
          userName: user.name,
          drinks: variables,
        },
        tags: { type: 'UpdateHistoryEntry', scope: 'drinks' },
      });
      if (context?.previousHistory) {
        queryClient.setQueryData(drinkKeys.userHistory(user.id), context.previousHistory);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: drinkKeys.userHistory(user.id) });
      queryClient.invalidateQueries({ queryKey: drinkKeys.paymentHistory(user.id) });
    },
  });
