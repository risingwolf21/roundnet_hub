import { queryClient } from '@/lib/queryClient';
import { NotificationsRepository } from '@/repository/NotificationsRepository';
import { Tables } from '@/types/helpers';
import { formatDateToDatabase } from '@/utils';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Notification } from 'types/supabase';

export const notificationKeys = {
  all: ['notifications'] as const,
  byUser: (userId: string) => [...notificationKeys.all, 'byUser', userId] as const,
  topics: () => [...notificationKeys.all, 'topics'] as const,
  preferences: (userId: string) => [...notificationKeys.byUser(userId), 'preferences'] as const,
  tags: (userId: string) => [...notificationKeys.byUser(userId), 'tags'] as const,
};

export const useAllNotifications = (user: User | null) =>
  useQuery<Notification[]>({
    queryKey: notificationKeys.all,
    enabled: !!user,
    queryFn: () => NotificationsRepository.fetchNotifications(user!.id),
  });

export const useDismissNotification = () =>
  useMutation({
    mutationFn: async ({ notficationId }: { notficationId: string }) => {
      return NotificationsRepository.dismissNotification(notficationId);
    },
    onMutate: async ({ notficationId }) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previousNotifications = queryClient.getQueryData<Notification[]>(notificationKeys.all);

      if (previousNotifications) {
        const newNotifications = previousNotifications.map((x) => {
          if (x.id === notficationId) {
            return {
              ...x,
              dismissed_at: formatDateToDatabase(new Date()),
            };
          }
          return x;
        });
        queryClient.setQueriesData({ queryKey: notificationKeys.all }, newNotifications);
      }

      return { previousNotifications };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'InsertItem', scope: 'items' },
      });
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.all, context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

export const useMarkNotificationsAsRead = (user: User) =>
  useMutation({
    mutationFn: async () => {
      return NotificationsRepository.clearAllNotifications(user.id);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previousNotifications = queryClient.getQueryData<Notification[]>(notificationKeys.all);

      queryClient.setQueriesData({ queryKey: notificationKeys.all }, []);

      return { previousNotifications };
    },
    onError: (error, _vars, context) => {
      captureException(error, {
        extra: {
          userName: user.name,
          userId: user.id,
          ...error,
        },
        tags: { type: 'MarkNotficiationsRead', scope: 'notifications' },
      });
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.all, context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

export const useNotificationTags = (user: User) =>
  useQuery<Tables<'notifications', 'user_notification_preferences'>[]>({
    queryKey: notificationKeys.preferences(user.id),
    queryFn: () => NotificationsRepository.fetchNotificationPreferences(user.id),
  });

export const useNotificationTopics = () =>
  useQuery<Tables<'notifications', 'notification_topics'>[]>({
    queryKey: notificationKeys.topics(),
    queryFn: () => NotificationsRepository.fetchNotificationTopics(),
  });

export const useUpdateNotificationPreferences = (user: User) =>
  useMutation({
    mutationFn: async ({
      topic,
      enabled,
      channel = 'webpush',
      scopeType,
      scopeId,
    }: {
      topic: string;
      enabled: boolean;
      channel?: string;
      scopeType: string;
      scopeId?: string;
    }) => {
      return NotificationsRepository.setNotificationPreference({ topic, enabled, channel, scopeType, scopeId });
    },
    onMutate: async ({ topic, enabled, channel, scopeType, scopeId }) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.tags(user.id) });
      const previousNotificationTags = queryClient.getQueryData<Tables<'user_notification_preferences'>[]>([
        'notifications',
        user.id,
        'preferences',
      ]);

      if (previousNotificationTags) {
        const newNotificationTags = [
          ...previousNotificationTags,
          {
            topic,
            enabled,
            channel,
            scope_id: scopeId,
            scope_type: scopeType,
          },
        ] as Tables<'user_notification_preferences'>[];
        queryClient.setQueriesData({ queryKey: notificationKeys.preferences(user.id) }, newNotificationTags);
      }

      return { previousNotificationTags };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          userName: user.name,
          userId: user.id,
          ...error,
          ...variables,
        },
        tags: { type: 'UpdateNotificationPerferences', scope: 'notifications' },
      });
      if (context?.previousNotificationTags) {
        queryClient.setQueryData(notificationKeys.preferences(user.id), context.previousNotificationTags);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences(user.id) });
    },
  });
