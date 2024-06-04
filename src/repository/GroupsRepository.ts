import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {supabase} from "../components/services/supabase/supabaseClient";
import {TablesInsert} from "../types/supabase-generated.types";

export const GroupsRepository = {
    async upsertGroup(group: TablesInsert<'event_group'>): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from("event_group")
            .upsert(group)
            .throwOnError();
    }
}