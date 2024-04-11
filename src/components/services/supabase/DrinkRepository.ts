import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {TABLE_DRINK, TABLE_HISTORY, TABLE_PAYMENTS} from "../../../constants";
import {
    Drink,
    DrinkCounter,
    FullHistory,
    Payment,
    PaymentHistory,
    PaymentInsert,
    PaymentState
} from "../../../types/supabaseTypes";
import {supabase} from "./supabaseClient";

export const SupabaseDrinkRepository = {

    async updateDrinkStock(drinkId: number, stock: number): Promise<PostgrestSingleResponse<any>> {
        return supabase.from(TABLE_DRINK)
            .update({stock}).eq("id", drinkId)
            .throwOnError();
    },

    async fetchHistoryForUser(userId: string, page: number = 0, count: number = 20): Promise<PostgrestSingleResponse<FullHistory[]>> {
        return supabase
            .from(TABLE_HISTORY)
            .select('id, count, amount, created_at, drinkId: drink, drink(*), user(*)')
            .not("user", "is", null)
            .eq('user.userId', userId)
            .range(page * count, page * count + count - 1)
            .order('created_at', {ascending: false})
            .returns<FullHistory[]>()
            .throwOnError();
    },

    async fetchCurrentPaymentForUser(userId: string): Promise<PostgrestSingleResponse<any[]>> {
        return supabase
            .from(TABLE_PAYMENTS)
            .select("*")
            .eq("userId", userId)
            .eq("paymentState", "Open")
            .returns<Payment[]>()
            .throwOnError();
    },

    async insertNewPayment(userId: string): Promise<PostgrestSingleResponse<PaymentInsert>> {
        return supabase
            .from(TABLE_PAYMENTS)
            .insert({
                userId: userId,
                paymentState: "Open"
            })
            .select()
            .returns<PaymentInsert>()
            .single()
            .throwOnError()
    },

    async fetchOpenDrinksForUser(userId: string): Promise<PostgrestSingleResponse<FullHistory[]>> {
        return supabase
            .from(TABLE_HISTORY)
            .select("*, drink ( price, name ), payment(*)")
            .eq("user ", userId)
            .eq("payment.paymentState", "Open" as PaymentState)
            .returns<FullHistory[]>()
            .throwOnError()
    },

    async insertHistoryItems(drinks: DrinkCounter[], userId: string, paymentId: number): Promise<PostgrestSingleResponse<any>> {
        return supabase
            .from(TABLE_HISTORY)
            .insert(drinks.map((drink) => {
                return {
                    user: userId,
                    drink: drink.id,
                    count: drink.count,
                    payment: paymentId,
                    amount: drink.count * (drink.price ?? 1)
                }
            }))
            .throwOnError()
    },

    async updateHistoryItem(id: number, count: number, amount: number): Promise<PostgrestSingleResponse<any>> {
        return supabase
            .from(TABLE_HISTORY)
            .update({count: count, amount: amount})
            .eq("id", id)
            .throwOnError();
    },

    async fetchDrinksToPay(userId: string): Promise<PostgrestSingleResponse<PaymentHistory[]>> {
        return supabase
            .from(TABLE_HISTORY)
            .select("id, count, created_at, user, amount, drink ( name, price ), payments ( paymentState )")
            .eq('payments.paymentState', "Open")
            .not("payments", "is", null)
            .eq('user', userId)
            .returns<PaymentHistory[]>()
            .throwOnError();
    },

    async fetchDrinks(): Promise<PostgrestSingleResponse<Drink[]>> {
        return supabase
            .from(TABLE_DRINK)
            .select("*")
            .order('id', {ascending: false})
            .returns<Drink[]>()
            .throwOnError();
    }

}