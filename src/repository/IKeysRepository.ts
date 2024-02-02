import {PostgrestError, PostgrestSingleResponse} from "@supabase/supabase-js";
import {FullKeyHolder, Key, KeyInsert, User} from "src/types/supabaseTypes";
import {SupabaseRepository} from "./Repository";
import {formatDateToDatabase} from "src/utils";

export interface IKeysRepository {
    getKeys(): Promise<PostgrestSingleResponse<FullKeyHolder[]>>

    giveKeyToUser(key: Key, user: User): Promise<PostgrestSingleResponse<null>>

    createKey(key: KeyInsert, userId: string): Promise<PostgrestSingleResponse<null>>
}

export class SupabaseKeysRepository extends SupabaseRepository implements IKeysRepository {

    async createKey(key: KeyInsert, userId: string): Promise<PostgrestSingleResponse<null>> {
        const {data, error} = await this.client
            .from("keys")
            .insert(key)
            .select()
            .single();
        if (!data || error)
            return {
                error: {
                    code: "",
                    details: "",
                    hint: "",
                    message: "Key could not be added to database"
                } as PostgrestError, data: null, count: null, status: 400, statusText: ""
            };
        return this.client

            .from("key_holders")
            .insert({user: userId, key: data.id});
    }

    async getKeys(): Promise<PostgrestSingleResponse<FullKeyHolder[]>> {
        return this.client
            .from("key_holders")
            .select("*, user: user(*), key: key(*)")
            .returns<FullKeyHolder[]>();
    }

    async giveKeyToUser(key: Key, user: User): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from("key_holders")
            .update({
                user: user.userId,
                lastUpdate: formatDateToDatabase(new Date()),
            })
            .eq("key", key.id);
    }

}