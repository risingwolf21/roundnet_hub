import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {
    Drink,
    DrinkCounter,
    FullHistory,
    Payment,
    PaymentHistory,
    PaymentInsert,
    PaymentState
} from "../types/supabaseTypes";
import {supabase} from "../components/services/supabase/supabaseClient";

export const SupabaseDrinkRepository = {

    async updateDrinkStock(drinkId: number, stock: number): Promise<PostgrestSingleResponse<any>> {
        return supabase.from('drink')
            .update({stock}).eq("id", drinkId)
            .throwOnError();
    },

    async fetchHistoryForUser(userId: string, page: number = 0, count: number = 20): Promise<PostgrestSingleResponse<FullHistory[]>> {
        return supabase
            .from('history')
            .select('id, count, amount, created_at, drinkId: drink, drink(*), user(*)')
            .not("user", "is", null)
            .eq('user.userId', userId)
            .range(page * count, page * count + count - 1)
            .order('created_at', {ascending: false})
            .returns<FullHistory[]>()
            .throwOnError();
    },

    async fetchOpenPaymentIdForUser(userId: string): Promise<PostgrestSingleResponse<number>> {
        return supabase.rpc("get_or_create_payment_for_user", {user_id: userId})
            .throwOnError();
    },

    async fetchCurrentPaymentForUser(userId: string): Promise<PostgrestSingleResponse<any[]>> {
        return supabase
            .from('payments')
            .select("*")
            .eq("userId", userId)
            .eq("paymentState", "Open")
            .returns<Payment[]>()
            .throwOnError();
    },

    async insertNewPayment(userId: string): Promise<PostgrestSingleResponse<PaymentInsert>> {
        return supabase
            .from('payments')
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
            .from('history')
            .select("*, drink ( price, name ), payment(*)")
            .eq("user ", userId)
            .eq("payment.paymentState", "Open" as PaymentState)
            .returns<FullHistory[]>()
            .throwOnError()
    },

    async insertHistoryItems(drinks: DrinkCounter[], userId: string, paymentId: number): Promise<PostgrestSingleResponse<any>> {
        return supabase
            .from('history')
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
            .from('history')
            .update({count: count, amount: amount})
            .eq("id", id)
            .throwOnError();
    },

    async fetchDrinksToPay(userId: string): Promise<PostgrestSingleResponse<PaymentHistory[]>> {
        return supabase
            .from('history')
            .select("id, count, created_at, user, amount, drink ( name, price ), payments ( paymentState )")
            .eq('payments.paymentState', "Open")
            .not("payments", "is", null)
            .eq('user', userId)
            .returns<PaymentHistory[]>()
            .throwOnError();
    },

    async fetchDrinks(): Promise<PostgrestSingleResponse<Drink[]>> {
        return supabase
            .from('drink')
            .select("*")
            .order('id', {ascending: false})
            .returns<Drink[]>()
            .throwOnError();
    }

}