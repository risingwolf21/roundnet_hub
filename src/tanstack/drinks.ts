import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { fetchFullHistory } from '@/repository/DrinkRepository';
import { DrinkCounter, PaymentHistory } from '@/types/supabaseTypes';
import { formatDateToDatabase } from '@/utils';
import { InfiniteData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

export const usePaymentHistory = (userId: string) =>
  useQuery({
    queryKey: ['payment', userId],
    queryFn: async () => {
      const result = await supabase
        .from('history')
        .select('*, drink ( name, price ), payments ( paymentState ), voucher')
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
    queryKey: ['vouchers'],
    queryFn: async () => {
      const result = await supabase.from('user_vouchers').select('*').throwOnError();

      return result.data ?? [];
    },
  });

export const useDrinks = () =>
  useQuery({
    queryKey: ['drinks'],
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
    queryKey: ['history', userId],
    queryFn: async ({ pageParam }) => {
      const { data } = await fetchFullHistory()
        .not('user', 'is', null)
        .eq('user.userId', userId)
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['history', user.userId] });
      queryClient.invalidateQueries({ queryKey: ['payment', user.userId] });
    },
  });
};

export const useUpdateHistoryEntryMutation = (userId: string) =>
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
      await queryClient.cancelQueries({ queryKey: ['history', userId] });
      const previousHistory = queryClient.getQueryData<InfiniteData<FullHistory[]>>(['history', userId]);

      if (previousHistory) {
        const newHistory = {
          ...previousHistory,
          pages: previousHistory.pages.map((page) =>
            page.map((history) => (history.id === newEntry.id ? newEntry : history))
          ),
        };
        queryClient.setQueriesData({ queryKey: ['history', userId] }, newHistory);
      }
      return { previousHistory };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousHistory) {
        queryClient.setQueryData(['history', userId], context.previousHistory);
      }
    },
    onSettled: (_data, _error, _variables, _context) => {
      queryClient.invalidateQueries({ queryKey: ['history', userId] });
      queryClient.invalidateQueries({ queryKey: ['payment', userId] });
    },
  });
