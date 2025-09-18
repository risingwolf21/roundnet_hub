import { InfiniteData, useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from 'src/lib/queryClient';
import { supabase } from "src/lib/supabase";
import { fetchFullHistory, SupabaseDrinkRepository } from "src/repository/DrinkRepository";
import { PaymentHistory } from "src/types/supabaseTypes";

export const usePaymentHistory = (userId: string) => useQuery({
  queryKey: ["payment", userId],
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
  }
});

export const useVouchers = () => useQuery({
  queryKey: ["vouchers"],
  queryFn: async () => {
    const result = await supabase
      .from('user_vouchers')
      .select('*')
      .throwOnError();

    return result.data ?? [];
  }
});

export const useDrinks = () => useQuery({
  queryKey: ["drinks"],
  queryFn: async () => {
    const result = await supabase.from('drink').select('*')
      .order('id', { ascending: false })
      .returns<Drink[]>()
      .throwOnError();

    return result.data ?? []
  }
})

export const useInfiniteUserHistory = (userId: string, count: number = 20) => useInfiniteQuery({
  queryKey: ["history", userId],
  queryFn: async ({ pageParam }) => {
    const { data } = await fetchFullHistory()
      .not('user', 'is', null)
      .eq('user.userId', userId)
      .range(pageParam * count, pageParam * count + count - 1)
      .order('created_at', { ascending: false })
      .returns<FullHistory[]>()
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

export const useInsertHistoryEntryMutation = (userId: string) => useMutation({
  mutationFn: async (drink: Drink) => SupabaseDrinkRepository.insertHistoryItems([{
    ...drink,
    count: 1
  }]),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["history", userId] });
  }
})

export const useUpdateHistoryEntryMutation = (userId: string) => useMutation({
  mutationFn: async (newEntry: FullHistory) => {
    const result = await supabase.from('history')
      .update({ count: newEntry.count, amount: newEntry.amount })
      .eq('id', newEntry.id)
      .throwOnError();
    return result.data;
  },
  onMutate: async (newEntry: FullHistory) => {
    await queryClient.cancelQueries({ queryKey: ["history", userId] });
    const previousHistory = queryClient.getQueryData<InfiniteData<FullHistory[]>>(["history", userId]);

    if (previousHistory) {
      const newHistory = {
        ...previousHistory,
        pages: previousHistory.pages
          .map(page => page.map(history => history.id === newEntry.id ? newEntry : history))
      }
      queryClient.setQueriesData({ queryKey: ["history", userId] }, newHistory);
    }
    return { previousHistory }
  },
  onError: (err, _vars, context) => {
    if (context?.previousHistory) {
      queryClient.setQueryData(["history", userId], context.previousHistory);
    }
  },
  onSettled: (data, error, variables, context) => {
    queryClient.invalidateQueries({ queryKey: ["history", userId] });
  },
})