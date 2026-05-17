import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { fetchFullHistory } from '@/repository/DrinkRepository';
import { DrinkCounter, PaymentHistory } from '@/types/supabaseTypes';
import { captureException } from '@sentry/react';
import { InfiniteData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import _ from "lodash";


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
    meta: { suppressErrorToast: true },
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

export const useDeleteDrinkMutation = () => useMutation({
  meta: { suppressErrorToast: true },
  mutationFn: async (drink: Drink) => {
    const result = await supabase
      .from("drink")
      .delete()
      .eq("id", drink.id)
      .throwOnError();

    return result;
  },
  onMutate: async (drink) => {
    await queryClient.cancelQueries({ queryKey: drinkKeys.drinks() });
    await queryClient.cancelQueries({ queryKey: drinkKeys.listAdmin() });

    const previousDrinkList = queryClient.getQueryData<Drink[]>(drinkKeys.drinks());

    if (previousDrinkList) {
      const newDrinkList = previousDrinkList.filter(x => x.id !== drink.id)
      queryClient.setQueryData(drinkKeys.drinks(), newDrinkList);
    }

    const previousAdminDrinkList = queryClient.getQueryData<Drink[]>(drinkKeys.listAdmin());

    if (previousAdminDrinkList) {
      const newAdminDrinkList = previousAdminDrinkList.filter(x => x.id !== drink.id)
      queryClient.setQueryData(drinkKeys.drinks(), newAdminDrinkList);
    }

    return { previousDrinkList, previousAdminDrinkList }
  },
  onError: (error, variables, context) => {
    captureException(error, {
      extra: {
        ...error,
        drink: variables,
      },
      tags: { type: 'DeleteDrink', scope: 'drinks' },
    });
    if (context?.previousDrinkList) {
      queryClient.setQueryData(drinkKeys.drinks(), context.previousDrinkList);
    }
    if (context?.previousDrinkList) {
      queryClient.setQueryData(drinkKeys.listAdmin(), context.previousAdminDrinkList);
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: drinkKeys.drinks() });
    queryClient.invalidateQueries({ queryKey: drinkKeys.listAdmin() });
  }
})

export const useInsertDrinkMutation = () => useMutation({
  meta: { suppressErrorToast: true },
  mutationFn: async (drink: Drink) => {
    const drinkInsert = _.omit(drink, ['id']);
    const result = await supabase
      .from("drink")
      .insert({ ...drinkInsert })
      .throwOnError();

    return result;
  },
  onMutate: async (drink) => {
    await queryClient.cancelQueries({ queryKey: drinkKeys.drinks() });
    await queryClient.cancelQueries({ queryKey: drinkKeys.listAdmin() });

    const previousDrinkList = queryClient.getQueryData<Drink[]>(drinkKeys.drinks());

    if (previousDrinkList) {
      queryClient.setQueryData(drinkKeys.drinks(), [...previousDrinkList, drink]);
    }

    const previousAdminDrinkList = queryClient.getQueryData<Drink[]>(drinkKeys.listAdmin());

    if (previousAdminDrinkList) {
      queryClient.setQueryData(drinkKeys.drinks(), [...previousAdminDrinkList, drink]);
    }

    return { previousDrinkList, previousAdminDrinkList }
  },
  onError: (error, variables, context) => {
    captureException(error, {
      extra: {
        ...error,
        drink: variables,
      },
      tags: { type: 'UpdateDrink', scope: 'drinks' },
    });
    if (context?.previousDrinkList) {
      queryClient.setQueryData(drinkKeys.drinks(), context.previousDrinkList);
    }
    if (context?.previousDrinkList) {
      queryClient.setQueryData(drinkKeys.listAdmin(), context.previousAdminDrinkList);
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: drinkKeys.drinks() });
    queryClient.invalidateQueries({ queryKey: drinkKeys.listAdmin() });
  }
})

export const useUpdateDrinkMutation = () => useMutation({
  meta: { suppressErrorToast: true },
  mutationFn: async (drink: Drink) => {
    const drinkUpdate = _.omit(drink, ['id']);
    const result = await supabase
      .from("drink")
      .update({ ...drinkUpdate })
      .eq("id", drink.id)
      .throwOnError();

    return result;
  },
  onMutate: async (drink) => {
    await queryClient.cancelQueries({ queryKey: drinkKeys.drinks() });
    await queryClient.cancelQueries({ queryKey: drinkKeys.listAdmin() });

    const previousDrinkList = queryClient.getQueryData<Drink[]>(drinkKeys.drinks());

    if (previousDrinkList) {
      const newDrinkList = previousDrinkList.map(x => {
        if (x.id === drink.id) {
          return drink;
        }
        return x;
      });
      queryClient.setQueryData(drinkKeys.drinks(), newDrinkList);
    }

    const previousAdminDrinkList = queryClient.getQueryData<Drink[]>(drinkKeys.listAdmin());

    if (previousAdminDrinkList) {
      const newAdminDrinkList = previousAdminDrinkList.map(x => {
        if (x.id === drink.id) {
          return drink;
        }
        return x;
      });
      queryClient.setQueryData(drinkKeys.drinks(), newAdminDrinkList);
    }

    return { previousDrinkList, previousAdminDrinkList }
  },
  onError: (error, variables, context) => {
    captureException(error, {
      extra: {
        ...error,
        drink: variables,
      },
      tags: { type: 'UpdateDrink', scope: 'drinks' },
    });
    if (context?.previousDrinkList) {
      queryClient.setQueryData(drinkKeys.drinks(), context.previousDrinkList);
    }
    if (context?.previousDrinkList) {
      queryClient.setQueryData(drinkKeys.listAdmin(), context.previousAdminDrinkList);
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: drinkKeys.drinks() });
    queryClient.invalidateQueries({ queryKey: drinkKeys.listAdmin() });
  }
})

export const useUpdateHistoryEntryMutation = (user: User) =>
  useMutation({
    meta: { suppressErrorToast: true },
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
        const newStat = {
          ...newEntry,
        }
        queryClient.setQueryData<InfiniteData<{ data: FullHistory[]; nextPage: number | undefined }>>(
          drinkKeys.userHistory(user.id),
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
