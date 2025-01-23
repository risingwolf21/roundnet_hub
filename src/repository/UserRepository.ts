import { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';
import { formatDateToDatabase } from 'src/utils';
import { Notification } from 'types/supabase';
import { supabase } from '../components/services/supabase/supabaseClient';

export const fetchGroups = () => supabase.from('group_user_mapping').select('group(*)');
export const fetchUserWithGroups = () => supabase
  .from('user')
  .select('*, groups: group_user_mapping ( group: event_group ( * ) )')
export const fetchSimpleUser = () => supabase.from("user").select("userId, name")

export const SupabaseUserRepository = {

  async fetchSimpleUsers(): Promise<PostgrestSingleResponse<SimpleUser[]>> {
    return fetchSimpleUser();
  },

  async fetchUserWithGroups(userId: string): Promise<PostgrestSingleResponse<UserWithGroupsAndPlayerData>> {
    const { data: player_data } = await SupabaseUserRepository.fetchPlayer(userId);
    const response = await fetchUserWithGroups()
      .eq('userId', userId)
      .maybeSingle();

    if (!response.data || response.error)
      return {
        error: {
          code: '',
          details: '',
          hint: '',
          message: 'Could not load all information for user',
        } as PostgrestError,
        data: null,
        count: null,
        status: 400,
        statusText: '',
      };

    return {
      ...response,
      data: {
        ...response.data,
        groups: response.data?.groups.map((x: any) => x.group) ?? [],
        player_data
      },
    };
  },

  async fetchUser(userId: string): Promise<PostgrestSingleResponse<User>> {
    return supabase.from('user').select('*').eq('userId', userId).single().throwOnError();
  },

  async fetchGroupsForUser(userId: string): Promise<Group[]> {
    const { data } = await fetchGroups().eq('user', userId).throwOnError();

    return data?.map(x => x.group) ?? [];
  },

  async fetchPlayer(userId: string): Promise<PostgrestSingleResponse<Player | null>> {
    return supabase.schema('games').from('players').select('*').eq('player', userId).maybeSingle().throwOnError();
  },

  async updateNotificationTags(
    notificationTags: NotificationTags[],
    user: User
  ): Promise<PostgrestSingleResponse<User>> {
    return supabase
      .from('user')
      .update({ notifications: notificationTags })
      .eq('userId', user.userId)
      .select()
      .single();
  },

  async updateFCMToken(fcmToken: string, deviceId: string, user: User): Promise<PostgrestSingleResponse<any>> {
    return supabase
      .from('notification_token')
      .update({ fcm_token: fcmToken, device_id: deviceId, last_used: formatDateToDatabase(Date.now()) })
      .eq('userId', user.userId);
  },

  async loadNotifications(user: User): Promise<PostgrestSingleResponse<Notification[]>> {
    return supabase.from('notifications').select('*').eq('user', user.userId).throwOnError().returns<Notification[]>();
  },
  async markNotificationsAsRead(user: User): Promise<PostgrestSingleResponse<null>> {
    return supabase.from('notifications').delete().eq('user', user.userId);
  },
};
