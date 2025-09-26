import { supabase } from '@/lib/supabase';
import { GroupWithUserRole } from '@/types/supabaseTypes';
import { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';

export const fetchGroups = () => supabase.schema('public').from('group_user_mapping').select('*, event_group(*)');
export const fetchUserWithGroups = () =>
  supabase.from('user').select('*, groups: group_user_mapping (group: event_group(*))');
export const fetchSimpleUser = () => supabase.from('user').select('userId, name');

export const SupabaseUserRepository = {
  async fetchUserWithGroups(userId: string): Promise<PostgrestSingleResponse<UserWithGroupsAndPlayerData>> {
    const { data: player_data } = await SupabaseUserRepository.fetchPlayer(userId);
    const response = await fetchUserWithGroups().eq('userId', userId).maybeSingle();

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
        player_data,
      },
    };
  },

  async fetchUser(userId: string): Promise<PostgrestSingleResponse<User>> {
    return supabase.from('user').select('*').eq('userId', userId).single().throwOnError();
  },

  async fetchGroupsForUser(userId: string): Promise<GroupWithUserRole[]> {
    const { data, error } = await fetchGroups().eq('user', userId);
    if (!data || error) return [];
    return data.map((x) => ({ ...x.event_group, user_role: x.role }) as GroupWithUserRole);
  },

  async fetchPermissionsForUser(): Promise<string[]> {
    const { data, error } = await supabase.from('user_permissions').select('*');

    if (error || !data) return [];
    return data.map((x) => x.permission).filter((x) => x !== null);
  },

  async fetchFeaturesForUser(): Promise<string[]> {
    const { data, error } = await supabase.from('user_features').select('*');

    if (error || !data) return [];
    return data.map((x) => x.feature).filter((x) => x !== null);
  },

  async fetchGrantsForUser(userId: string) {
    const { data, error } = await supabase.from('user_grants').select('*').eq('user', userId);

    if(error || !data) return [];

    return data;
  },

  async fetchPlayer(userId: string): Promise<PostgrestSingleResponse<Player | null>> {
    return supabase.schema('games').from('players').select('*').eq('player', userId).maybeSingle().throwOnError();
  },
};
