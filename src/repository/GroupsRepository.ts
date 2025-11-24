import { supabase } from '@/lib/supabase';
import { GroupWithUserMappings } from '@/types/supabaseTypes';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { Tables, TablesInsert } from '../types/supabase-generated.types';
import { fetchGroupWithUsers } from './AdminUsersRepository';

export const GroupsRepository = {
  async upsertGroup(group: TablesInsert<'event_group'>): Promise<PostgrestSingleResponse<Tables<'event_group'>>> {
    return supabase.from('event_group').upsert(group).select('*').single().throwOnError();
  },
  async addUserToGroup(
    group: string,
    user: string,
    role: 'user' | 'admin' | 'joinRequested'
  ): Promise<PostgrestSingleResponse<null>> {
    return supabase.from('group_user_mapping').insert({ group, user, role }).throwOnError();
  },
  async fetchSingleGroupWithUsers(groupId?: string): Promise<GroupWithUserMappings | null> {
    if (!groupId) return null;

    const { data: group } = await supabase.from('event_groups_view').select('*').eq('id', groupId).single();

    const { data } = await fetchGroupWithUsers().eq('id', groupId).maybeSingle().throwOnError();

    if (!group || !data) return null;

    return {
      ...data,
      user_group_role: group.role,
      users: data.mapping.map((x) => ({ user: x.user, map: { group: x.group, role: x.role, user: x.user.id } })),
    };
  },
  async fetchGroups(): Promise<GroupWithUserMappings[]> {
    const response = await supabase.from('event_groups_view').select('*').throwOnError();

    return (response.data ?? []).map((x) => {
      return { ...x, user_group_role: x.role, users: [] } as GroupWithUserMappings;
    });
  },
};
