import { supabase } from '@/lib/supabase';
import { GroupWithUserRole } from '@/types/supabaseTypes';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

export const fetchGroups = () => supabase.schema('public').from('group_user_mapping').select('*, event_group(*)');
export const fetchSimpleUser = () => supabase.from('user').select('id, name, avatarUrl');

export const SupabaseUserRepository = {

  async fetchUser(userId: string): Promise<PostgrestSingleResponse<User>> {
    return supabase.from('user').select('*').eq('id', userId).single().throwOnError();
  },

  async fetchGroupsForUser(userId: string): Promise<GroupWithUserRole[]> {
    const { data, error } = await fetchGroups().eq('user', userId);
    if (error) throw error;
    if (!data) return [];
    return data.map(
      (x) =>
        ({
          ...x.event_group,
          user_role: x.role,
        }) as GroupWithUserRole
    );
  },
};
