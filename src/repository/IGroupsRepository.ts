import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {GroupInsert} from "src/types/supabaseTypes";
import {SupabaseRepository} from "./Repository";

export interface IGroupsRepository {
    upsertGroup(group: GroupInsert): Promise<PostgrestSingleResponse<null>>
}

export class SupabaseGroupsRepository extends SupabaseRepository implements IGroupsRepository {

    async upsertGroup(group: GroupInsert): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from("event_group")
            .upsert(group)
            .throwOnError();
    }
}