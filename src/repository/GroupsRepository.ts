import {GroupInsert} from "../types/supabaseTypes";
import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {supabase} from "../components/services/supabase/supabaseClient";

export const GroupsRepository = {
    async upsertGroup(group: GroupInsert): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from("event_group")
            .upsert(group)
            .throwOnError();
    }
}