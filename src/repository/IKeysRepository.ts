import {PostgrestError, PostgrestSingleResponse} from "@supabase/supabase-js";
import {FullKeyHistory, FullKeyHolder, Key, KeyInsert, User} from "src/types/supabaseTypes";
import {SupabaseRepository} from "./Repository";
import {formatDateToDatabase} from "src/utils";

export interface IKeysRepository {
    getKeys(): Promise<PostgrestSingleResponse<FullKeyHolder[]>>

    giveKeyToUser(key: Key, user: User): Promise<PostgrestSingleResponse<null>>

    fetchInsertedKey(key: number, user: string): Promise<PostgrestSingleResponse<FullKeyHolder[]>>

    upsertKey(key: KeyInsert, userId: string): Promise<PostgrestSingleResponse<null>>

    loadKeyHistory(keyId: number): Promise<PostgrestSingleResponse<FullKeyHistory[]>>
}

export class SupabaseKeysRepository extends SupabaseRepository implements IKeysRepository {
    async loadKeyHistory(keyId: number): Promise<PostgrestSingleResponse<any>> {
        return this.client
            .from("key_history")
            .select("*, pastUser: user!key_history_pastuser_fkey(*), currentUser: user!key_history_currentuser_fkey(*), key: key(*)")
            .eq("key.id", keyId)
            .not("key", "is", null)
            .order("created_at", {ascending: false})
            .throwOnError();
    }

    async upsertKey(key: KeyInsert, userId: string): Promise<PostgrestSingleResponse<null>> {
        const {data, error} = await this.client
            .from("keys")
            .upsert(key)
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
            .upsert({user: userId, key: data.id});
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

    async fetchInsertedKey(key: number, user: string): Promise<PostgrestSingleResponse<FullKeyHolder[]>> {
        return this.client
            .from("key_holders")
            .select("*, user: user(*), key: key(*)")
            .eq("key.id", key)
            .eq("user.userId", user)
            .not("key", "is", null)
            .returns<FullKeyHolder[]>();
    }

}