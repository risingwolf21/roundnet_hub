import { UserEdited } from '@/features/admin/dialogs/EditUserDialog';
import { queryClient } from '@/lib/queryClient';
import { AdminDrinksRepository } from '@/repository/AdminDrinksRepository';
import { AdminUsersRepository, RpcName } from '@/repository/AdminUsersRepository';
import { UserRepository } from '@/repository/UserRepository';
import { FullPayment, UserWithGroups } from '@/types/supabaseTypes';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

export type { RpcName };

export const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  history: () => [...adminKeys.all, 'history'] as const,
  payments: {
    list: () => [...adminKeys.all, 'payments', 'list'] as const,
  },
  simpleUsers: () => [...adminKeys.all, 'simpleUsers'] as const,
  logs: (pageKey: string, filterKey: string, sortKey: string) => [...adminKeys.all, 'logs', pageKey, filterKey, sortKey] as const,
  analytics: (rpc: string, from: string, to: string) => [...adminKeys.all, 'analytics', rpc, from, to],
  unlinkedPlayers: () => [...adminKeys.all, 'unlinkedPlayers'],
  tableOptions: (table: string) => [...adminKeys.all, 'tableOptions', table],
};

export const useUnlinkedPlayers = () =>
  useQuery({
    queryKey: adminKeys.unlinkedPlayers(),
    queryFn: () => AdminUsersRepository.fetchUnlinkedPlayers(),
  });

export const useUsers = () =>
  useQuery({
    queryKey: adminKeys.simpleUsers(),
    queryFn: () => UserRepository.fetchSimpleUsers(),
  });

export const useAdminAnalytics = (
  rpc: RpcName | undefined,
  params: Record<string, any>,
  enabled: boolean = true
) => useQuery({
  queryKey: ['admin', 'analytics', rpc, params],
  enabled: !!rpc && enabled,
  queryFn: async () => {
    if (!rpc) return [];
    return AdminUsersRepository.runAnalytics(rpc, params);
  }
});

export const useAnalyticsTableOptions = (table: string, labelField: string = 'name') =>
  useQuery({
    queryKey: adminKeys.tableOptions(table),
    queryFn: () => AdminUsersRepository.fetchTableOptions(table, labelField),
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
    queryFn: () => AdminUsersRepository.fetchOpenPayments(),
  });

export const useConfirmPaymentMutation = () =>
  useMutation({
    mutationFn: async ({ payment }: { payment: FullPayment }) => {
      return AdminUsersRepository.confirmPayment(payment?.user?.id);
    },
    onMutate: async ({ payment }) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.payments.list() });

      const previousPayments = queryClient.getQueryData<FullPayment[]>(adminKeys.payments.list());

      if (previousPayments) {
        const newPayments = previousPayments.map((x) => {
          if (x.user === payment.user.id) {
            return {
              ...x,
              paymentState: 'Fulfilled' as PaymentState,
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
    meta: { suppressErrorToast: true },
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
