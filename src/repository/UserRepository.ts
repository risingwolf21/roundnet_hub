import { supabase } from '@/lib/supabase';
import { TablesUpdate } from '@/types/supabase-generated.types';
import { GroupWithUserRole } from '@/types/supabaseTypes';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

export const fetchGroups = () => supabase.schema('public').from('group_user_mapping').select('*, event_group(*)');
export const fetchSimpleUser = () => supabase.from('user').select('id, name, avatarUrl');

export const UserRepository = {
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

  async fetchSimpleUsers() {
    const result = await fetchSimpleUser().throwOnError();
    return result.data ?? [];
  },

  async fetchProfile(userId: string) {
    const result = await supabase.schema('public').from('user').select('*').eq('id', userId).maybeSingle().throwOnError();
    return result?.data ?? null;
  },

  async fetchLinkedPlayer(userId: string) {
    const result = await supabase.schema('games').from('players').select('*').eq('linked_user_id', userId).maybeSingle().throwOnError();
    return result?.data ?? null;
  },

  async listAvatarFiles(userId: string) {
    return supabase.storage.from('user').list(`${userId}`);
  },

  async removeAvatarFiles(paths: string[]) {
    return supabase.storage.from('user').remove(paths);
  },

  async uploadAvatar(path: string, file: File | Blob, options?: { upsert?: boolean }) {
    return supabase.storage.from('user').upload(path, file, options);
  },

  getAvatarUrl(path: string): string | null {
    const { data } = supabase.storage.from('user').getPublicUrl(path);
    return data?.publicUrl ?? null;
  },

  async updateProfile(userId: string, update: TablesUpdate<'user'>) {
    const { data } = await supabase.from('user').update(update).eq('id', userId).select('*').maybeSingle().throwOnError();
    return data;
  },
};
