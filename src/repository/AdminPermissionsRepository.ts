import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {supabase} from "../components/services/supabase/supabaseClient";
import {Tables} from "../types/supabase-generated.types";

export const AdminPermissionsRepository = {

    async fetchPermissions(): Promise<PostgrestSingleResponse<any>> {
        return supabase
            .from("role_permissions")
            .select("*")
            .returns<Tables<'role_permissions'>[]>()
            .throwOnError()
    }
}