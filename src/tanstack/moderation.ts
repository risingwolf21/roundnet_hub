import { queryClient } from '@/lib/queryClient';
import { ModerationRepository, ReportReason } from '@/repository/ModerationRepository';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authKeys } from './auth';

export const moderationKeys = {
  all: ['moderation'] as const,
  myReports: (userId?: string) => [...moderationKeys.all, 'my-reports', userId] as const,
  blocked: (userId?: string) => [...moderationKeys.all, 'blocked', userId] as const,
  openReports: () => [...moderationKeys.all, 'open-reports'] as const,
};

// Hidden comments are filtered by the database, so every cached comment list is stale after a change.
const invalidateComments = () =>
  queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes('comments') });

export const useMyReportedCommentIds = (userId?: string) =>
  useQuery({
    queryKey: moderationKeys.myReports(userId),
    enabled: !!userId,
    queryFn: () => ModerationRepository.fetchMyReportedCommentIds(userId!),
  });

export const useReportComment = (userId: string) =>
  useMutation({
    mutationFn: (v: { commentId: string; reason: ReportReason; details?: string }) =>
      ModerationRepository.reportComment(userId, v.commentId, v.reason, v.details),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: moderationKeys.myReports(userId) }),
  });

export const useBlockedUsers = (userId?: string) =>
  useQuery({
    queryKey: moderationKeys.blocked(userId),
    enabled: !!userId,
    queryFn: () => ModerationRepository.fetchBlockedUsers(userId!),
  });

export const useBlockUser = (userId: string) =>
  useMutation({
    mutationFn: (blocked: string) => ModerationRepository.blockUser(userId, blocked),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: moderationKeys.blocked(userId) }), invalidateComments()]),
  });

export const useUnblockUser = (userId: string) =>
  useMutation({
    mutationFn: (blocked: string) => ModerationRepository.unblockUser(userId, blocked),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: moderationKeys.blocked(userId) }), invalidateComments()]),
  });

export const useOpenReports = () =>
  useQuery({
    queryKey: moderationKeys.openReports(),
    queryFn: () => ModerationRepository.fetchOpenReports(),
  });

export const useOpenReportCount = (enabled: boolean) =>
  useQuery({
    queryKey: moderationKeys.openReports(),
    enabled,
    queryFn: () => ModerationRepository.fetchOpenReports(),
    select: (reports) => reports.length,
  });

export const useModerateReport = () =>
  useMutation({
    mutationFn: (v: { reportId: string; action: 'dismiss' | 'remove' }) =>
      ModerationRepository.moderateReport(v.reportId, v.action),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: moderationKeys.openReports() }), invalidateComments()]),
  });

export const useAcceptTerms = (userId: string) =>
  useMutation({
    mutationFn: () => ModerationRepository.acceptTerms(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.currentUser(userId) }),
  });
