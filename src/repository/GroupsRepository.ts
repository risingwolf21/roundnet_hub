import { supabase } from '@/lib/supabase';
import { GroupWithUserMappings } from '@/types/supabaseTypes';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { Tables, TablesInsert, TablesUpdate } from '../types/supabase-generated.types';
import { fetchGroupWithUsers } from './AdminUsersRepository';

export const fetchGroupUsers = (groupId: string) =>
  supabase
    .from('group_user_mapping')
    .select('*, user: user(*)').eq('group', groupId);

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

    const [{ data: group }, { data }] = await Promise.all([
      supabase.from('event_groups_view').select('*').eq('id', groupId).single(),
      fetchGroupWithUsers().eq('id', groupId).maybeSingle().throwOnError(),
    ]);

    if (!group || !data) return null;

    return {
      ...data,
      user_group_role: group.role,
      users: data.mapping.map((x) => ({ user: x.user, map: { group: x.group, role: x.role, user: x.user.id, trial_started_at: x.trial_started_at, trial_event_limit: x.trial_event_limit } })),
    };
  },

  async fetchGroups(): Promise<GroupWithUserMappings[]> {
    const response = await supabase.from('event_groups_view').select('*').throwOnError();
    return (response.data ?? []).map((x) => {
      return { ...x, user_group_role: x.role, users: [] } as GroupWithUserMappings;
    });
  },

  async fetchGroupUsers(groupId: string, role?: GroupRole): Promise<GroupUsers[]> {
    let query = fetchGroupUsers(groupId).throwOnError();
    if (role) query = query.eq('role', role);


    const result = await query;

    if (result.error) throw result.error;
    return result.data as unknown as GroupUsers[];
  },

  async fetchRequestedUsers(excludeUserId: string): Promise<GroupUserMapping[]> {
    const result = await supabase
      .from('group_user_mapping')
      .select('*')
      .eq('role', 'joinRequested')
      .neq('user', excludeUserId);
    return result.data ?? [];
  },

  async removeUserFromGroup(groupId: string, userId: string) {
    const result = await supabase
      .schema('public')
      .from('group_user_mapping')
      .delete()
      .eq('group', groupId)
      .eq('user', userId)
      .throwOnError();
    return result.data;
  },

  async updateUserRole(groupId: string, userId: string, role: GroupRole) {
    const result = await supabase
      .schema('public')
      .from('group_user_mapping')
      .update({ role })
      .eq('group', groupId)
      .eq('user', userId)
      .throwOnError();
    return result.data;
  },

  async createGroupWithUser(group: Omit<Group, 'id'>, userId: string) {
    const result = await supabase
      .rpc('create_group_with_user', {
        group_color: group.color,
        group_description: group.description,
        group_name: group.name,
        is_public: group.is_public,
        need_request: group.need_request_to_join,
        parent: group.parent_group ?? undefined,
        role: 'admin',
        user_id: userId,
      })
      .throwOnError();
    return result.data!;
  },

  async updateGroup(groupId: string, update: TablesUpdate<'event_group'>) {
    const result = await supabase
      .schema('public')
      .from('event_group')
      .update({
        name: update.name,
        description: update.description,
        color: update.color,
        is_public: update.is_public,
        need_request_to_join: update.need_request_to_join,
        parent_group: update.parent_group,
        visible: update.visible,
      })
      .eq('id', groupId)
      .select('*')
      .single()
      .throwOnError();
    return result.data!;
  },
};
