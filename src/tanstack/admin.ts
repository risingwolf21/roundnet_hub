import { UserEdited } from '@/features/admin/dialogs/EditUserDialog';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { AdminDrinksRepository } from '@/repository/AdminDrinksRepository';
import { AdminUsersRepository } from '@/repository/AdminUsersRepository';
import { fetchSimpleUser } from '@/repository/UserRepository';
import { FullPayment, UserWithGroups } from '@/types/supabaseTypes';
import { mapOperator, serializeFilterKey, serializePaginationKey, serializeSortKey } from '@/utils/mui-x-data-grid.utils';
import { GridFilterModel } from '@mui/x-data-grid/models';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { GridPaginationModel } from 'node_modules/@mui/x-data-grid/esm/models/gridPaginationProps';
import { GridSortModel } from 'node_modules/@mui/x-data-grid/esm/models/gridSortModel';

export const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  history: () => [...adminKeys.all, 'history'] as const,
  payments: {
    list: () => [...adminKeys.all, 'payments', 'list'] as const,
  },
  simpleUsers: () => [...adminKeys.all, 'simpleUsers'] as const,
  logs: (pageKey: string, filterKey: string, sortKey: string) => [...adminKeys.all, 'logs', pageKey, filterKey, sortKey] as const,
  analytics: (rpc: string, from: string, to: string) => [...adminKeys.all, 'analytics', rpc, from, to]
};

export const useUsers = () =>
  useQuery({
    queryKey: adminKeys.simpleUsers(),
    queryFn: async () => {
      const result = await fetchSimpleUser().throwOnError();

      return result.data ?? [];
    },
  });

const cleanParams = (params: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
  );
};

export const useAdminAnalytics = (
  rpc: RpcName | undefined,
  params: Record<string, any>,
  enabled: boolean = true
) => useQuery({
  queryKey: ['admin', 'analytics', rpc, params],
  enabled: !!rpc && enabled,
  queryFn: async () => {
    if (!rpc) return [];

    const { data, error } = await supabase.rpc(
      rpc as any,
      cleanParams(params) as any
    );

    if (error) {
      throw error;
    }

    return data as any[];
  }
});

export const useLogsList = ({ paginationModel, sortModel, filterModel }: { paginationModel: GridPaginationModel, sortModel?: GridSortModel, filterModel?: GridFilterModel }) =>
  useQuery({
    queryKey: adminKeys.logs(serializePaginationKey(paginationModel), serializeFilterKey(filterModel), serializeSortKey(sortModel)),
    queryFn: async () => {
      let query = supabase
        .schema('audit')
        .from('log')
        .select('*', { count: 'exact' })
        .range(paginationModel.page * paginationModel.pageSize, paginationModel.page * paginationModel.pageSize + paginationModel.pageSize - 1);

      (sortModel ?? []).forEach(({ field, sort }) => {
        if (field && sort) query = query.order(field, { ascending: sort === 'asc', nullsFirst: false });
      });

      (filterModel?.items ?? []).forEach((item) => {
        if (!item.field || !item.operator || item.value === undefined) return;
        query = mapOperator(query, item.field, item.operator as string, item.value);
      });

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return { rows: (data ?? []), count: count ?? 0 };
    },
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
