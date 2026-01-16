import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/helpers';
import { formatDateToDatabase } from '@/utils';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Notification } from 'types/supabase';

export const useAllNotifications = (user: User | null) =>
  useQuery<Notification[]>({
    queryKey: ['notifications'],
    enabled: !!user,
    queryFn: async () => {
      const result = await supabase
        .schema('notifications')
        .from('notifications')
        .select('*')
        .eq('user', user!.id)
        .throwOnError()
        .returns<Notification[]>();

      return result.data ?? [];
    },
  });

export const useDismissNotification = () =>
  useMutation({
    mutationFn: async ({ notficationId }: { notficationId: string }) => {
      const result = await supabase
        .schema('notifications')
        .from('notifications')
        .update({ dismissed_at: formatDateToDatabase(new Date()) })
        .eq('id', notficationId)
        .throwOnError();

      return result;
    },
    onMutate: async ({ notficationId }) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(['notifications']);

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
        queryClient.setQueriesData({ queryKey: ['notifications'] }, newNotifications);
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
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

export const useMarkNotificationsAsRead = (user: User) =>
  useMutation({
    mutationFn: async () => {
      const result = await supabase
        .schema('notifications')
        .from('notifications')
        .delete()
        .eq('user', user.id)
        .throwOnError();

      return result;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(['notifications']);

      queryClient.setQueriesData({ queryKey: ['notifications'] }, []);

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
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

export const useNotificationTags = (user: User) =>
  useQuery<Tables<'notifications', 'user_notification_preferences'>[]>({
    queryKey: ['notifications', user.id, 'preferences'],
    queryFn: async () => {
      const result = await supabase
        .schema('notifications')
        .from('user_notification_preferences')
        .select('*')
        .eq('user', user.id)
        .throwOnError();

      return result.data ?? [];
    },
  });

export const useNotificationTopics = () =>
  useQuery<Tables<'notifications', 'notification_topics'>[]>({
    queryKey: ['notifications', 'topics'],
    queryFn: async () => {
      const result = await supabase.schema('notifications').from('notification_topics').select('*').throwOnError();

      return result.data ?? [];
    },
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
      const result = await supabase
        .schema('notifications')
        .rpc('set_notification_pref', {
          p_topic: topic,
          p_enabled: enabled,
          p_channel: channel,
          p_scope_type: scopeType,
          p_scope_id: scopeId,
        })
        .throwOnError();

      return result.data;
    },
    onMutate: async ({ topic, enabled, channel, scopeType, scopeId }) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user.id, 'tags'] });
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
        queryClient.setQueriesData({ queryKey: ['notifications', user.id, 'preferences'] }, newNotificationTags);
      }

      return { previousNotificationTags };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          userName: user.name,
          userId: user.id,
          ...error,
          ...variables
        },
        tags: { type: 'UpdateNotificationPerferences', scope: 'notifications' },
      });
      if (context?.previousNotificationTags) {
        queryClient.setQueryData(['notifications', user.id, 'preferences'], context.previousNotificationTags);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user.id, 'preferences'] });
    },
  });
