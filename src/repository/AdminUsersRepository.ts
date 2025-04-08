import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { UserEdited } from 'src/features/admin/dialogs/EditUserDialog';
import { UserWithGroups } from 'src/types/supabaseTypes';
import { supabase } from '../components/services/supabase/supabaseClient';

export const fetchGroupWithUsers = () => supabase.from('event_group').select('*, users: group_user_mapping ( role, user (*) )');

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
  async fetchSingleGroupWithUsers(groupId: string): Promise<PostgrestSingleResponse<GroupWithUsersBase>> {
    return fetchGroupWithUsers()
      .eq('id', groupId)
      .single()
      .throwOnError();
  },

  async deactivateUser(user: User): Promise<void> {
    await supabase.from('payments').update({ paymentState: 'Fulfilled' }).eq('userId', user.userId);

    await supabase.from('user').update({ verified: false }).eq('userId', user.userId);
  },

  async updateUser(user: UserEdited): Promise<PostgrestSingleResponse<null>> {
    await supabase.schema("permissions").from('user_roles').delete().eq('user', user.userId);
    await supabase.schema("permissions").from('user_roles').upsert(
      user.roles.map((x) => {
        return {
          app_role: x.id,
          user: user.userId,
        };
      })
    );
    return supabase
      .from('user')
      .update({ displayName: user.displayName, verified: user.verified })
      .eq('userId', user.userId);
  },

  async fetchNotVerifiedUsers(): Promise<PostgrestSingleResponse<User[]>> {
    return supabase.from('user').select('*').eq('verified', false).returns<User[]>().throwOnError();
  },

  async fetchAllUsersWithGroups(): Promise<PostgrestSingleResponse<UserWithGroups[]>> {
    return supabase
      .from('user')
      .select('*, groups: group_user_mapping ( group: event_group ( * ))')
      .order('displayName', { ascending: true })
      .returns<UserWithGroups[]>()
      .throwOnError();
  },

  async addUsersToGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>> {
    return supabase
      .from('group_user_mapping')
      .upsert(
        users.map((x) => {
          return {
            user: x.userId,
            group: group.id,
          };
        })
      )
      .throwOnError();
  },
};
