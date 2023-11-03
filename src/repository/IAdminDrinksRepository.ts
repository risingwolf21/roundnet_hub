import { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";
import { injectable, inject } from "inversify";
import { Drink } from "../types/supabaseTypes";
import { Database } from "../types/supabase";
import _ from "lodash";
import { TABLE_DRINK, TABLE_HISTORY } from "../constants";
import { SupabaseRepository } from "./Repository";

export interface IAdminDrinksRepository {
    fetchDrinks(): Promise<PostgrestSingleResponse<any[]>>
    fetchAdminHistory(page: number, count: number): Promise<PostgrestSingleResponse<any[]>>
    updateDrink(drink: Drink): Promise<void>
    deleteDrink(id: number): Promise<void>
    addDrink(drink: Drink): Promise<void>
}

@injectable()
export class SupabaseAdminDrinksRepository extends SupabaseRepository implements IAdminDrinksRepository {

    async fetchDrinks(): Promise<PostgrestSingleResponse<any[]>> {
        const query = this.client
            .from(TABLE_DRINK)
            .select("id, name, price, stock, imageUrl, active, deleted, previousDrink");

        return query;
    }

    async fetchAdminHistory(page: number = 0, count: number = 20): Promise<PostgrestSingleResponse<any[]>> {
        const query = this.client
            .from(TABLE_HISTORY)
            .select("count, amount, created_at, drinkId: drink, drink(*), user(*)")
            .order('created_at', { ascending: false })
            .range(page * count, page * count + count - 1);

        return query;
    }

    async updateDrink(drink: Drink): Promise<void> {
        await this.client
            .from('drink')
            .update(drink)
            .eq('id', drink.id);
    }

    async deleteDrink(id: number): Promise<void> {
        await this.client
            .from('drink')
            .delete()
            .eq('id', id);
    }

    async addDrink(drink: Drink): Promise<void> {
        await this.client
            .from('drink')
            .insert(_.omit(drink, ["id"]));
    }
}

@injectable()
export class EmptyAdminDrinksRepository implements IAdminDrinksRepository {
    fetchDrinks(): Promise<PostgrestSingleResponse<any[]>> {
        throw new Error("Method not implemented.");
    }
    fetchAdminHistory(page: number, count: number): Promise<PostgrestSingleResponse<any[]>> {
        throw new Error("Method not implemented.");
    }
    updateDrink(drink: { active: boolean; deleted: boolean; id: number; imageUrl: string | null; name: string | null; previousDrink: number | null; price: number | null; stock: number | null; }): Promise<void> {
        throw new Error("Method not implemented.");
    }
    deleteDrink(id: number): Promise<void> {
        throw new Error("Method not implemented.");
    }
    addDrink(drink: { active: boolean; deleted: boolean; id: number; imageUrl: string | null; name: string | null; previousDrink: number | null; price: number | null; stock: number | null; }): Promise<void> {
        throw new Error("Method not implemented.");
    }
}