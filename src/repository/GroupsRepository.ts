import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase } from '../components/services/supabase/supabaseClient';
import { Tables, TablesInsert } from '../types/supabase-generated.types';
import { fetchGroupWithUsers } from './AdminUsersRepository';

export const GroupsRepository = {
  async upsertGroup(group: TablesInsert<'event_group'>): Promise<PostgrestSingleResponse<Tables<'event_group'>>> {
    return supabase.from('event_group').upsert(group).select('*').single().throwOnError();
  },
  async addUserToGroup(group: string, user: string, role?: "user" | "admin" | "joinRequested"): Promise<PostgrestSingleResponse<Tables<'group_user_mapping'>>> {
    return supabase.from('group_user_mapping').insert({ group, user, role }).select("*").single().throwOnError();
  },
  async fetchSingleGroupWithUsers(groupId: string): Promise<PostgrestSingleResponse<GroupWithUsers>> {
    return fetchGroupWithUsers()
      .eq('id', groupId)
      .single()
      .throwOnError();
  },
};
