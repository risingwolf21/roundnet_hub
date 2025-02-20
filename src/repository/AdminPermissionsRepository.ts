import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase } from '../components/services/supabase/supabaseClient';

export const fetchRolePermissionMapping = () => supabase
  .schema("permissions")
  .from('role_permissions')
  .select('id, permission: app_permissions!role_permissions_app_permission_fkey(*), role: app_roles!role_permissions_app_role_fkey(*)')

export const AdminPermissionsRepository = {
  async fetchPermissions(): Promise<PostgrestSingleResponse<RolePermissionMapping[]>> {
    return fetchRolePermissionMapping()
      .returns<RolePermissionMapping[]>()
      .throwOnError();
  },

  async fetchAllAppPermissions(): Promise<PostgrestSingleResponse<AppPermission[]>> {
    return supabase.schema("permissions").from('app_permissions').select('*').returns<AppPermission[]>().throwOnError();
  },

  async fetchAllAppRoles(): Promise<PostgrestSingleResponse<AppRole[]>> {
    return supabase.schema("permissions").from('app_roles').select('*').returns<AppRole[]>().throwOnError();
  },

  async fetchRolesForUser(userId: string): Promise<AppRole[]> {
    const { data, error } = await supabase
      .schema("permissions")
      .from('user_roles')
      .select('app_role (*)')
      .eq('user', userId)
      .returns<{ app_role: AppRole }[]>()
    if (error || !data) return [];
    return data.map((x) => x.app_role as AppRole);
  },

  async fetchPermissionsForRoles(roles: AppRole[]): Promise<AppPermission[]> {
    const { data, error } = await supabase
      .schema("permissions")
      .from('role_permissions')
      .select('app_permission(*)')
      .in(
        'app_role',
        roles.map((x) => x.id)
      )
      .returns<{ app_permission: AppPermission }[]>();
    if (error || !data) return [];
    return [...new Set(data.map((x) => x.app_permission as AppPermission))];
  },
};
