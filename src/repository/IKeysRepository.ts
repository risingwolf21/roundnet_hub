import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { FullKeyHolder, Key, User } from "src/types/supabaseTypes";
import { SupabaseRepository } from "./Repository";
import { formatDateToDatabase } from "src/utils";

export interface IKeysRepository {
    getKeys(): Promise<PostgrestSingleResponse<FullKeyHolder[]>>
    giveKeyToUser(key: Key, user: User): Promise<PostgrestSingleResponse<null>>
}

export class SupabaseKeysRepository extends SupabaseRepository implements IKeysRepository {

    async getKeys(): Promise<PostgrestSingleResponse<FullKeyHolder[]>> {
        const query = this.client
            .from("key_holders")
            .select("*, user: user(*), key: key(*)")
            .returns<FullKeyHolder[]>();

        return query;
    }

    async giveKeyToUser(key: Key, user: User): Promise<PostgrestSingleResponse<null>> {
        const query = this.client
            .from("key_holders")
            .update({
                user: user.userId,
                lastUpdate: formatDateToDatabase(new Date()),
            })
            .eq("key", key.id);

        return query;
    }

}