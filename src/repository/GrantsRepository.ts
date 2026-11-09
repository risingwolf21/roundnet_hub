import { supabase } from '@/lib/supabase';

export const GrantsRepository = {
  async fetchAdminGroups() {
    const result = await supabase.from('event_groups_view').select('*').eq('role', 'admin').throwOnError();
    return result.data ?? [];
  },

  async fetchPermissions(): Promise<string[]> {
    const { data, error } = await supabase.from('permissions').select('name').order('name');
    if (error) throw error;
    return data?.map((x) => x.name) ?? [];
  },

  async fetchFeatures(): Promise<string[]> {
    const { data, error } = await supabase.from('features').select('name').order('name');
    if (error) throw error;
    return data?.map((x) => x.name) ?? [];
  },

  async fetchUsersWithDirectGrants(): Promise<User[]> {
    const result = await supabase.from('user_direct_grants').select('user:user(*)').throwOnError();
    const users = new Map<string, User>();
    result.data?.forEach((x) => !users.has(x.user.id) && users.set(x.user.id, x.user));
    return [...users.values()];
  },

  async fetchUserPermissionGrants(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_direct_grants')
      .select('*')
      .eq('kind', 'perm')
      .eq('user', userId);
    if (error) throw error;
    return data?.map((x) => x.key) ?? [];
  },

  async fetchUserFeatureGrants(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_direct_grants')
      .select('*')
      .eq('kind', 'feat')
      .eq('user', userId);
    if (error) throw error;
    return data?.map((x) => x.key) ?? [];
  },

  async fetchGroupPermissions(groupId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('group_permissions')
      .select('group, permission')
      .eq('group', groupId);
    if (error) throw error;
    return data?.map((x) => x.permission) ?? [];
  },

  async fetchGroupFeatures(groupId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('group_features')
      .select('group, feature')
      .eq('group', groupId);
    if (error && error.code === '42P01') return [];
    if (error) throw error;
    return data?.map((x) => x.feature) ?? [];
  },

  async grantUserGrants(user: string, perms: string[], feats: string[]) {
    const result = await supabase
      .rpc('grant_user_grants', { p_user: user, p_perms: perms, p_feats: feats })
      .throwOnError();
    return result.data;
  },

  async revokeUserGrants(user: string, perms: string[], feats: string[]) {
    const result = await supabase
      .rpc('revoke_user_grants', { p_user: user, p_perms: perms, p_feats: feats })
      .throwOnError();
    return result.data;
  },

  async grantGroupGrants(group: string, perms: string[], feats: string[]) {
    const result = await supabase
      .rpc('grant_group_grants', { p_group: group, p_perms: perms, p_feats: feats })
      .throwOnError();
    return result.data;
  },

  async revokeGroupGrants(group: string, perms: string[], feats: string[]) {
    const result = await supabase
      .rpc('revoke_group_grants', { p_group: group, p_perms: perms, p_feats: feats })
      .throwOnError();
    return result.data;
  },

  async fetchUserGrants(userId: string) {
    const { data, error } = await supabase.from('user_grants_view').select('kind,key').eq('user', userId);
    if (error) throw error;
    return data;
  },
};
