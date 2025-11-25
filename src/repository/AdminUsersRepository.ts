import { UserEdited } from '@/features/admin/dialogs/EditUserDialog';
import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase-generated.types';
import { UserWithGroups } from '@/types/supabaseTypes';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

export const fetchGroupWithUsers = () =>
  supabase.from('event_group').select('*, mapping: group_user_mapping ( user: user(*), group, role )');

export const AdminUsersRepository = {
  async removeUsersFromGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>> {
    return supabase
      .from('group_user_mapping')
      .delete()
      .eq('group', group.id)
      .in(
        'user',
        users.map((x) => x.id)
      )
      .throwOnError();
  },
  async fetchSingleGroupWithUsers(groupId: string): Promise<PostgrestSingleResponse<GroupWithUsers>> {
    return fetchGroupWithUsers().eq('id', groupId).single().throwOnError();
  },

  async deactivateUser(user: User): Promise<void> {
    await supabase.from('payments').update({ paymentState: 'Fulfilled' }).eq('user', user.id);

    await supabase.from('user').update({ verified: false }).eq('id', user.id);
  },

  async updateUser(user: UserEdited): Promise<User | null> {
    const result = await supabase
      .from('user')
      .update({ displayName: user.displayName, verified: user.verified })
      .eq('id', user.userId)
      .select('*')
      .single();

    return result.data ?? null;
  },

  async fetchNotVerifiedUsers(): Promise<PostgrestSingleResponse<User[]>> {
    return supabase.from('user').select('*').eq('verified', false).returns<User[]>().throwOnError();
  },

  async fetchAllUsersWithGroups(): Promise<UserWithGroups[]> {
    const result = await supabase
      .from('user')
      .select('*, groups: group_user_mapping ( group: event_group ( * ))')
      .order('displayName', { ascending: true })
      .throwOnError();

    return (
      result.data?.map((x) => ({
        ...x,
        groups: x.groups.map((x: any) => x.group) ?? [],
      })) ?? []
    );
  },

  async addUsersToGroup(group: Group, users: User[]): Promise<Tables<'group_user_mapping'>[]> {
    const result = await supabase
      .from('group_user_mapping')
      .upsert(
        users.map((x) => {
          return {
            user: x.id,
            group: group.id,
          };
        })
      )
      .select('*')
      .throwOnError();

    return result.data ?? [];
  },
};
