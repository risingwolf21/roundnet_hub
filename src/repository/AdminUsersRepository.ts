import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { UserEdited } from 'src/features/admin/dialogs/EditUserDialog';
import { UserWithGroups } from 'src/types/supabaseTypes';
import { supabase } from 'src/lib/supabase';
import { Tables } from 'src/types/supabase-generated.types';

export const fetchGroupWithUsers = () => supabase.from('event_group').select('*, mapping: group_user_mapping ( user: user(*), group, role )');

export const AdminUsersRepository = {
  async removeUsersFromGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>> {
    return supabase
      .from('group_user_mapping')
      .delete()
      .eq('group', group.id)
      .in(
        'user',
        users.map((x) => x.userId)
      )
      .throwOnError();
  },
  async fetchSingleGroupWithUsers(groupId: string): Promise<PostgrestSingleResponse<GroupWithUsers>> {
    return fetchGroupWithUsers()
      .eq('id', groupId)
      .single()
      .throwOnError();
  },

  async deactivateUser(user: User): Promise<void> {
    await supabase.from('payments').update({ paymentState: 'Fulfilled' }).eq('userId', user.userId);

    await supabase.from('user').update({ verified: false }).eq('userId', user.userId);
  },

  async updateUser(user: UserEdited): Promise<User | null> {
    const result = await supabase
      .from('user')
      .update({ displayName: user.displayName, verified: user.verified })
      .eq('userId', user.userId)
      .select("*")
      .single();

    return result.data ?? null
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

    return result.data?.map(x => ({
      ...x,
      groups: x.groups.map((x: any) => x.group) ?? [],
    })) ?? [];
  },

  async addUsersToGroup(group: Group, users: User[]): Promise<Tables<"group_user_mapping">[]> {
    const result = await supabase
      .from('group_user_mapping')
      .upsert(
        users.map((x) => {
          return {
            user: x.userId,
            group: group.id,
          };
        })
      )
      .select("*")
      .throwOnError();

    return result.data ?? [];
  },
};
