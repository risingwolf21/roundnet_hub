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
  }
};
