import {injectable} from "inversify";
import {SupabaseRepository} from "./Repository";
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
import {TABLE_DRINK, TABLE_HISTORY, TABLE_PAYMENTS} from "../constants";

export interface IDrinkRepository {
    fetchDrinksToPay(userId: string): Promise<PostgrestSingleResponse<PaymentHistory[]>>

    fetchDrinks(): Promise<PostgrestSingleResponse<Drink[]>>

    fetchHistoryForUser(userId: string, page: number, count: number): Promise<PostgrestSingleResponse<FullHistory[]>>

    fetchOpenDrinksForUser(userId: string): Promise<PostgrestSingleResponse<FullHistory[]>>

    fetchCurrentPaymentForUser(userId: string): Promise<PostgrestSingleResponse<Payment[]>>

    insertHistoryItems(drinks: DrinkCounter[], userId: string, paymentId: number): Promise<PostgrestSingleResponse<any>>

    updateHistoryItem(id: number, count: number, amount: number): Promise<PostgrestSingleResponse<any>>

    insertNewPayment(userId: string): Promise<PostgrestSingleResponse<PaymentInsert>>

    updateDrinkStock(drinkId: number, stock: number): Promise<PostgrestSingleResponse<any>>

}

@injectable()
export class SupabaseDrinkRepository extends SupabaseRepository implements IDrinkRepository {

    async updateDrinkStock(drinkId: number, stock: number): Promise<PostgrestSingleResponse<any>> {
        return this.client.from(TABLE_DRINK)
            .update({stock}).eq("id", drinkId)
            .throwOnError();
    }

    async fetchHistoryForUser(userId: string, page: number = 0, count: number = 20): Promise<PostgrestSingleResponse<FullHistory[]>> {
        return this.client
            .from(TABLE_HISTORY)
            .select('id, count, amount, created_at, drinkId: drink, drink(*), user(*)')
            .not("user", "is", null)
            .eq('user.userId', userId)
            .range(page * count, page * count + count - 1)
            .order('created_at', {ascending: false})
            .returns<FullHistory[]>()
            .throwOnError();
    }

    async fetchCurrentPaymentForUser(userId: string): Promise<PostgrestSingleResponse<any[]>> {
        return this.client
            .from(TABLE_PAYMENTS)
            .select("*")
            .eq("userId", userId)
            .eq("paymentState", "Open")
            .returns<Payment[]>()
            .throwOnError();
    }

    async insertNewPayment(userId: string): Promise<PostgrestSingleResponse<PaymentInsert>> {
        return new Promise((resolve, reject) => this.client.from(TABLE_PAYMENTS)
            .insert({
                userId: userId,
                paymentState: "Open"
            })
            .select()
            .returns<PaymentInsert>()
            .single()
            .throwOnError()
            .then(result => {
                if (!result.error && result.data)
                    resolve(result)
                else
                    reject(result.error)
            })
        )
    }

    async fetchOpenDrinksForUser(userId: string): Promise<PostgrestSingleResponse<FullHistory[]>> {
        return new Promise((resolve, reject) => this.client
            .from(TABLE_HISTORY)
            .select("*, drink ( price, name ), payment(*)")
            .eq("user ", userId)
            .eq("payment.paymentState", "Open" as PaymentState)
            .returns<FullHistory[]>()
            .throwOnError()
            .then(result => {
                if (!result.error && result.data)
                    resolve(result)
                else
                    reject(result.error)
            })
        )
    }

    async insertHistoryItems(drinks: DrinkCounter[], userId: string, paymentId: number): Promise<PostgrestSingleResponse<any>> {
        return this.client
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
    }

    async updateHistoryItem(id: number, count: number, amount: number): Promise<PostgrestSingleResponse<any>> {
        return this.client
            .from(TABLE_HISTORY)
            .update({count: count, amount: amount})
            .eq("id", id)
            .throwOnError();
    }

    async fetchDrinksToPay(userId: string): Promise<PostgrestSingleResponse<PaymentHistory[]>> {
        return this.client
            .from(TABLE_HISTORY)
            .select("id, count, created_at, user, amount, drink ( name, price ), payments ( paymentState )")
            .eq('payments.paymentState', "Open")
            .not("payments", "is", null)
            .eq('user', userId)
            .returns<PaymentHistory[]>()
            .throwOnError();
    }

    async fetchDrinks(): Promise<PostgrestSingleResponse<Drink[]>> {
        return this.client.from(TABLE_DRINK).select("*")
            .order('id', {ascending: false})
            .returns<Drink[]>()
            .throwOnError();
    }

}