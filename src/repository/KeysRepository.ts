import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {FullItemHolder, Item, User} from "../types/supabaseTypes";
import {formatDateToDatabase} from "../utils";
import {supabase} from "../components/services/supabase/supabaseClient";
import {TablesInsert, TablesUpdate} from "../types/supabase-generated.types";

export const SupabaseKeysRepository = {
    async loadKeyHistory(keyId: number): Promise<PostgrestSingleResponse<any>> {
        return supabase
            .from("item_history")
            .select("*, pastUser: user!key_history_pastuser_fkey(*), currentUser: user!key_history_currentuser_fkey(*), key: key(*)")
            .eq("key.id", keyId)
            .not("key", "is", null)
            .not("pastUser", "is", null)
            .not("currentUser", "is", null)
            .order("created_at", {ascending: false})
            .throwOnError();
    },

    async updateItem(item: TablesUpdate<'items'>, id: number): Promise<PostgrestSingleResponse<Item>> {
        return supabase
            .from("items")
            .update(item)
            .eq("id", id)
            .select()
            .single();
    },

    async insertItem(item: TablesInsert<'items'>): Promise<PostgrestSingleResponse<Item>> {
        return supabase
            .from("items")
            .insert(item)
            .select()
            .single();
    },

    async getItems(): Promise<PostgrestSingleResponse<FullItemHolder[]>> {
        return supabase
            .from("items")
            .select("*, current_holder: user!keys_user_fkey(*)")
            .returns<FullItemHolder[]>();
    },

    async giveItemToUser(key: Item, user: User): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from("items")
            .update({
                current_holder: user.userId,
                lastUpdate: formatDateToDatabase(new Date()),
            })
            .eq("id", key.id);
    },

    async fetchInsertedItem(key: number, user: string): Promise<PostgrestSingleResponse<FullItemHolder[]>> {
        return supabase
            .from("items")
            .select("*, user: user(*)")
            .eq("id", key)
            .eq("user.userId", user)
            .returns<FullItemHolder[]>();
    }
}