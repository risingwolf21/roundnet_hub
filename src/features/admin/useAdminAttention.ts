import { useAllPayments } from '@/tanstack/admin';
import { useRequestedUsersPerGroup } from '@/tanstack/groups';
import { useOpenReportCount } from '@/tanstack/moderation';
import { useGrants } from '../auth/GrantsContext';

/** Open work items an admin can act on. Only queries the data the user is allowed to see. */
export const useAdminAttention = () => {
  const { user, hasPerm } = useGrants();
  const canPay = hasPerm('drinks.confirm.payments');
  const canModerate = hasPerm('moderation.manage');
  const canManageGroups = hasPerm('groups.manage.admin');

  const paymentsQuery = useAllPayments(canPay);
  const reportsQuery = useOpenReportCount(canModerate);
  const joinsQuery = useRequestedUsersPerGroup(user);

  const paymentList = canPay ? (paymentsQuery.data ?? []) : [];
  const payments = paymentList.length;
  const reports = canModerate ? (reportsQuery.data ?? 0) : 0;
  const joinRequests = canManageGroups ? (joinsQuery.data?.length ?? 0) : 0;

  return {
    paymentList,
    payments,
    reports,
    joinRequests,
    /** Items that belong to the admin area itself (join requests already badge the groups entry). */
    total: payments + reports,
    isLoading:
      (canPay && paymentsQuery.isLoading) ||
      (canModerate && reportsQuery.isLoading) ||
      (canManageGroups && joinsQuery.isLoading),
  };
};
