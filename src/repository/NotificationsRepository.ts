import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/helpers';
import { formatDateToDatabase } from '@/utils';
import { Notification } from 'types/supabase';

export const NotificationsRepository = {
  async fetchNotifications(userId: string): Promise<Notification[]> {
    const result = await supabase
      .schema('notifications')
      .from('notifications')
      .select('*')
      .eq('user', userId)
      .order('created_at', { ascending: false })
      .throwOnError();
    return result.data ?? [];
  },

  async dismissNotification(notificationId: string) {
    const result = await supabase
      .schema('notifications')
      .from('notifications')
      .update({ dismissed_at: formatDateToDatabase(new Date()) })
      .eq('id', notificationId)
      .throwOnError();
    return result;
  },

  async clearAllNotifications(userId: string) {
    const result = await supabase
      .schema('notifications')
      .from('notifications')
      .delete()
      .eq('user', userId)
      .throwOnError();
    return result;
  },

  async fetchNotificationPreferences(userId: string): Promise<Tables<'notifications', 'user_notification_preferences'>[]> {
    const result = await supabase
      .schema('notifications')
      .from('user_notification_preferences')
      .select('*')
      .eq('user', userId)
      .throwOnError();
    return result.data ?? [];
  },

  async fetchNotificationTopics(): Promise<Tables<'notifications', 'notification_topics'>[]> {
    const result = await supabase.schema('notifications').from('notification_topics').select('*').throwOnError();
    return result.data ?? [];
  },

  async setNotificationPreference(params: {
    topic: string;
    enabled: boolean;
    channel?: string;
    scopeType: string;
    scopeId?: string;
  }) {
    const result = await supabase
      .schema('notifications')
      .rpc('set_notification_pref', {
        p_topic: params.topic,
        p_enabled: params.enabled,
        p_channel: params.channel ?? 'webpush',
        p_scope_type: params.scopeType,
        p_scope_id: params.scopeId,
      })
      .throwOnError();
    return result.data;
  },
};
