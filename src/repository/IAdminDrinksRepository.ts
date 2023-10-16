import { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";
import { injectable, inject } from "inversify";
import { Database, Drink } from "../types/supabase";
import _ from "lodash";

export interface IAdminDrinksRepository {
    fetchDrinks(): Promise<PostgrestSingleResponse<any[]> | null>
    fetchAdminHistory(page: number, count: number): Promise<PostgrestSingleResponse<any[]> | null>
    updateDrink(drink: Drink): Promise<void>
    deleteDrink(id: number): Promise<void>
    addDrink(drink: Drink): Promise<void>
}

@injectable()
export class SupabaseAdminDrinksRepository implements IAdminDrinksRepository {

    @inject("SupabaseClient")
    private client: SupabaseClient<Database> | undefined

    async fetchDrinks(): Promise<PostgrestSingleResponse<any[]> | null> {
        if (!this.client)
            throw Error("SupabaseClient was undefined.");

        console.log("Fetching drinks using SupabaseAdminDrinksRepository");
        const query = this.client
            .from("drink")
            .select("id, name, price, stock, imageUrl, active, deleted, previousDrink");

        return query;
    }

    async fetchAdminHistory(page: number = 0, count: number = 20): Promise<PostgrestSingleResponse<any[]> | null> {
        if (!this.client)
            throw Error("SupabaseClient was undefined.");

        const query = this.client
            .from("history")
            .select("count, amount, created_at, drinkId: drink, drink(*), user(*)")
            .order('id', { ascending: false })
            .range(page * count, page * count + count - 1);

        return query;
    }

    async updateDrink(drink: Drink): Promise<void> {
        if (this.client) {
            await this.client
                .from('drink')
                .update(drink)
                .eq('id', drink.id);
        } else {
            throw Error("SupabaseClient was undefined. Could not update Drink");
        }
    }

    async deleteDrink(id: number): Promise<void> {
        if (this.client) {
            await this.client
                .from('drink')
                .delete()
                .eq('id', id);
        } else {
            throw Error("SupabaseClient was undefined. Could not delete Drink");
        }
    }

    async addDrink(drink: Drink): Promise<void> {
        if (this.client) {
            await this.client
                .from('drink')
                .insert(_.omit(drink, ["id"]));
        } else {
            throw Error("SupabaseClient was undefined. Could not add Drink");
        }
    }
}