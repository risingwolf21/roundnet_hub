import { UserEdited } from '@/features/admin/dialogs/EditUserDialog';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { AdminDrinksRepository } from '@/repository/AdminDrinksRepository';
import { AdminUsersRepository } from '@/repository/AdminUsersRepository';
import { fetchSimpleUser } from '@/repository/UserRepository';
import { FullPayment, UserWithGroups } from '@/types/supabaseTypes';
import { formatDateToDatabase } from '@/utils';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

export const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  history: () => [...adminKeys.all, 'history'] as const,
  payments: {
    list: () => [...adminKeys.all, 'payments', 'list'] as const,
  },
  simpleUsers: () => [...adminKeys.all, 'simpleUsers'] as const,
  logs: () => [...adminKeys.all, 'logs'] as const,
  analytics: (rpc: string) => [...adminKeys.all, 'analytics', rpc]
};

export const useUsers = () =>
  useQuery({
    queryKey: adminKeys.simpleUsers(),
    queryFn: async () => {
      const result = await fetchSimpleUser().throwOnError();

      return result.data ?? [];
    },
  });

export const useAdminAnalytics = (rpc: RpcName, from: Date, to: Date) => useQuery({
  queryKey: adminKeys.analytics(rpc),
  queryFn: async () => {
    const result = await supabase.rpc(rpc, { p_from: formatDateToDatabase(from), p_to: formatDateToDatabase(to) });

    return result.data;
  }
})

export const useInfiniteLogsList = (count: number = 50) =>
  useInfiniteQuery({
    queryKey: adminKeys.logs(),
    queryFn: async ({ pageParam }) => {
      const result = await supabase
        .schema('audit')
        .from('log')
        .select('*')
        .order('at', { ascending: false })
        .range(pageParam * count, pageParam * count + count - 1);

      const hasMore = (result.data?.length ?? 0) === count;

      return {
        data: result.data ?? [],
        nextPage: hasMore ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

export const useAllUsersAsAdmin = () =>
  useQuery<UserWithGroups[]>({
    queryKey: adminKeys.users(),
    queryFn: () => AdminUsersRepository.fetchAllUsersWithGroups(),
  });

export const useInfiniteDrinkHistory = () =>
  useInfiniteQuery({
    queryKey: adminKeys.history(),
    queryFn: AdminDrinksRepository.fetchAdminHistory,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

export const useAllPayments = () =>
  useQuery<FullPayment[]>({
    queryKey: adminKeys.payments.list(),
    queryFn: async () => {
      const response = await supabase
        .from('payments')
        .select(
          'id, created_at, paymentState, amountToPay, userId: user, user (id, displayName, name, email), history (*)'
        )
        .eq('paymentState', 'Open' as PaymentState)
        .order('displayName', { referencedTable: 'user', ascending: true })
        .returns<FullPayment[]>();
      return response.data ?? [];
    },
  });

export const useConfirmPaymentMutation = () =>
  useMutation({
    mutationFn: async ({ payment }: { payment: FullPayment }) => {
      const result = await supabase
        .from('payments')
        .update({ paymentState: 'Fulfilled' as PaymentState })
        .eq('user', payment?.user?.id)
        .eq('paymentState', 'Open' as PaymentState)
        .select('*')
        .single();

      return result.data;
    },
    onMutate: async ({ payment }) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.payments.list() });

      const previousPayments = queryClient.getQueryData<FullPayment[]>(adminKeys.payments.list());

      if (previousPayments) {
        const newPayments = previousPayments.map((x) => {
          if (x.user === payment.user.id) {
            return {
              ...x,
              paymentState: 'FulFilled' as PaymentState,
            };
          }
          return x;
        });
        queryClient.setQueryData(adminKeys.payments.list(), newPayments);
      }

      return { previousPayments };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousPayments) {
        queryClient.setQueryData(['payments', 'admin'], context.previousPayments);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.payments.list() });
    },
  });

export const useUpdateUserMutation = () =>
  useMutation({
    mutationFn: ({ update }: { update: UserEdited }) => {
      return AdminUsersRepository.updateUser(update);
    },
    onMutate: async ({ update }) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.users() });

      const previousUsers = queryClient.getQueryData<UserWithGroups[]>(adminKeys.users());

      if (previousUsers) {
        const newUsers = previousUsers.map((x) => {
          if (x.id === update.userId) {
            return {
              ...x,
              displayName: update.displayName,
              verified: update.verified,
              role: update.role,
            };
          }
          return x;
        });
        queryClient.setQueryData(adminKeys.users(), newUsers);
      }

      return { previousUsers };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(adminKeys.users(), context.previousUsers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
