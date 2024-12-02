import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {supabase} from "../components/services/supabase/supabaseClient";
import {FullRolePermission} from "../types/supabaseTypes";


export const AdminPermissionsRepository = {

    async fetchPermissions(): Promise<PostgrestSingleResponse<FullRolePermission[]>> {
        return supabase
            .from("role_permissions")
            .select("*, app_permission(*), app_role(*)")
            .returns<FullRolePermission[]>()
            .throwOnError()
    },

    async fetchAllAppPermissions(): Promise<PostgrestSingleResponse<AppPermission[]>> {
        return supabase
            .from("app_permissions")
            .select("*")
            .returns<AppPermission[]>()
            .throwOnError()
    },

    async fetchAllAppRoles(): Promise<PostgrestSingleResponse<AppRole[]>> {
        return supabase
            .from("app_roles")
            .select("*")
            .returns<AppRole[]>()
            .throwOnError()
    },

    async fetchRolesForUser(userId: string): Promise<AppRole[]> {
        const {data, error} = await supabase
            .from("user_roles")
            .select("app_role (*)")
            .eq("user", userId)
            .returns<{ app_role: AppRole }[]>();
        if (error || !data)
            return [];
        return data.map((x) => x.app_role as AppRole)
    },

    async fetchPermissionsForRoles(roles: AppRole[]): Promise<AppPermission[]> {
        const {data, error} = await supabase
            .from("role_permissions")
            .select("app_permission(*)")
            .in("app_role", roles.map(x => x.id))
            .returns<{ app_permission: AppPermission }[]>();
        if (error || !data)
            return [];
        return [...(new Set(data.map((x) => x.app_permission as AppPermission)))]
    }
}