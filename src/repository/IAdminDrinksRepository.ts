import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {injectable} from "inversify";
import {Drink} from "../types/supabaseTypes";
import _ from "lodash";
import {TABLE_DRINK, TABLE_HISTORY} from "../constants";
import {SupabaseRepository} from "./Repository";

export interface IAdminDrinksRepository {
    fetchDrinks(): Promise<PostgrestSingleResponse<any[]>>

    fetchAdminHistory(page: number, count: number): Promise<PostgrestSingleResponse<any[]>>

    updateDrink(drink: Drink): Promise<PostgrestSingleResponse<null>>

    deleteDrink(id: number): Promise<PostgrestSingleResponse<null>>

    addDrink(drink: Drink): Promise<PostgrestSingleResponse<null>>
}

@injectable()
export class SupabaseAdminDrinksRepository extends SupabaseRepository implements IAdminDrinksRepository {

    async fetchDrinks(): Promise<PostgrestSingleResponse<any[]>> {
        return this.client
            .from(TABLE_DRINK)
            .select("id, name, price, stock, imageUrl, active, deleted, previousDrink")
            .throwOnError();
    }

    async fetchAdminHistory(page: number = 0, count: number = 20): Promise<PostgrestSingleResponse<any[]>> {
        return this.client
            .from(TABLE_HISTORY)
            .select("count, amount, created_at, drinkId: drink, drink(*), user(*)")
            .order('created_at', {ascending: false})
            .range(page * count, page * count + count - 1)
            .throwOnError();
    }

    async updateDrink(drink: Drink): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from('drink')
            .update(drink)
            .eq('id', drink.id)
            .throwOnError();
    }

    async deleteDrink(id: number): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from('drink')
            .delete()
            .eq('id', id)
            .throwOnError();
    }

    async addDrink(drink: Drink): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from('drink')
            .insert(_.omit(drink, ["id"]))
            .throwOnError();
    }
}