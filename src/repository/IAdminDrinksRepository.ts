import { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";
import { injectable, inject } from "inversify";

export interface IAdminDrinksRepository {
    fetchDrinks(): Promise<PostgrestSingleResponse<any[]> | null>
    fetchAdminHistory(page: number, count: number): Promise<PostgrestSingleResponse<any[]> | null>
}

@injectable()
export class SupabaseAdminDrinksRepository implements IAdminDrinksRepository {

    @inject("SupabaseClient")
    private client: SupabaseClient | undefined

    async fetchDrinks(): Promise<PostgrestSingleResponse<any[]> | null> {
        if (!this.client)
            return Promise.resolve(null);

        console.log("Fetching drinks using SupabaseAdminDrinksRepository");
        const query = this.client
            .from("drink")
            .select("id, name, price, stock, imageUrl, active, deleted, previousDrink");

        return query;
    }

    async fetchAdminHistory(page: number = 0, count: number = 20): Promise<PostgrestSingleResponse<any[]> | null> {
        if (!this.client)
            return Promise.resolve(null);
        const query = this.client
            .from("history")
            .select("count, amount, created_at, drinkId: drink, drink(*), user(*)")
            .order('id', { ascending: false })
            .range(page * count, page * count + count - 1);

        return query;
    }
}