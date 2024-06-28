import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {Drink} from "../types/supabaseTypes";
import _ from "lodash";
import {TABLE_DRINK, TABLE_HISTORY} from "../constants";
import {supabase} from "../components/services/supabase/supabaseClient";

export const AdminDrinksRepository = {

    async fetchDrinks(): Promise<PostgrestSingleResponse<any[]>> {
        return supabase
            .from(TABLE_DRINK)
            .select("id, name, price, stock, imageUrl, active, deleted, previousDrink")
            .throwOnError();
    },

    async fetchAdminHistory(page: number = 0, count: number = 20): Promise<PostgrestSingleResponse<any[]>> {
        return supabase
            .from(TABLE_HISTORY)
            .select("count, amount, created_at, drinkId: drink, drink(*), user(*)")
            .order('created_at', {ascending: false})
            .range(page * count, page * count + count - 1)
            .throwOnError();
    },

    async updateDrink(drink: Drink): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from('drink')
            .update(drink)
            .eq('id', drink.id)
            .throwOnError();
    },

    async deleteDrink(id: number): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from('drink')
            .delete()
            .eq('id', id)
            .throwOnError();
    },

    async addDrink(drink: Drink): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from('drink')
            .insert(_.omit(drink, ["id"]))
            .throwOnError();
    }
}