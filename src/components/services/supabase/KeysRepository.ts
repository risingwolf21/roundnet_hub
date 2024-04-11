import {PostgrestError, PostgrestSingleResponse} from "@supabase/supabase-js";
import {FullKeyHolder, Key, KeyInsert, User} from "../../../types/supabaseTypes";
import {formatDateToDatabase} from "../../../utils";
import {supabase} from "./supabaseClient";

export const SupabaseKeysRepository = {
    async loadKeyHistory(keyId: number): Promise<PostgrestSingleResponse<any>> {
        return supabase
            .from("key_history")
            .select("*, pastUser: user!key_history_pastuser_fkey(*), currentUser: user!key_history_currentuser_fkey(*), key: key(*)")
            .eq("key.id", keyId)
            .not("key", "is", null)
            .order("created_at", {ascending: false})
            .throwOnError();
    },

    async upsertKey(key: KeyInsert, userId: string): Promise<PostgrestSingleResponse<null>> {
        const {data, error} = await supabase
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
        return supabase
            .from("key_holders")
            .upsert({user: userId, key: data.id});
    },

    async getKeys(): Promise<PostgrestSingleResponse<FullKeyHolder[]>> {
        return supabase
            .from("key_holders")
            .select("*, user: user(*), key: key(*)")
            .returns<FullKeyHolder[]>();
    },

    async giveKeyToUser(key: Key, user: User): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from("key_holders")
            .update({
                user: user.userId,
                lastUpdate: formatDateToDatabase(new Date()),
            })
            .eq("key", key.id);
    },

    async fetchInsertedKey(key: number, user: string): Promise<PostgrestSingleResponse<FullKeyHolder[]>> {
        return supabase
            .from("key_holders")
            .select("*, user: user(*), key: key(*)")
            .eq("key.id", key)
            .eq("user.userId", user)
            .not("key", "is", null)
            .returns<FullKeyHolder[]>();
    }
}