import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase } from '../components/services/supabase/supabaseClient';
import { Tables, TablesInsert } from '../types/supabase-generated.types';

export const GroupsRepository = {
  async upsertGroup(group: TablesInsert<'event_group'>): Promise<PostgrestSingleResponse<Tables<'event_group'>>> {
    return supabase.from('event_group').upsert(group).select('*').single().throwOnError();
  },
  async addUserToGroup(group: string, user: string): Promise<PostgrestSingleResponse<null>> {
    return supabase.from('group_user_mapping').insert({ group, user }).throwOnError();
  },
};
