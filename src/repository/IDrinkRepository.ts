import { injectable } from "inversify";
import { SupabaseRepository } from "./Repository";
import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { Drink, DrinkCounter, FullHistory, Payment, History, PaymentInsert, PaymentHistory, PaymentState } from "../types/supabaseTypes";
import { TABLE_DRINK, TABLE_HISTORY, TABLE_PAYMENTS } from "../constants";
import { DrinkStockType } from "../components/procure/AnalyzeDrinkStockHistory";

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
    fetchHistoryStockType(): Promise<PostgrestSingleResponse<DrinkStockType[]>>
}

@injectable()
export class SupabaseDrinkRepository extends SupabaseRepository implements IDrinkRepository {

    async fetchHistoryStockType(): Promise<PostgrestSingleResponse<DrinkStockType[]>> {
        return this.client
            .from(TABLE_HISTORY)
            .select("count, amount, created_at, drink (id, name, price, stock), user(displayName)")
            .returns<DrinkStockType[]>()
            .order('id', { ascending: false })
    }
    async updateDrinkStock(drinkId: number, stock: number): Promise<PostgrestSingleResponse<any>> {
        return this.client.from(TABLE_DRINK)
            .update({ stock }).eq("id", drinkId)
    }

    async fetchHistoryForUser(userId: string, page: number = 0, count: number = 20): Promise<PostgrestSingleResponse<FullHistory[]>> {
        return this.client
            .from(TABLE_HISTORY)
            .select('id, count, amount, created_at, drinkId: drink, drink(*), user(*)')
            .not("user", "is", null)
            .eq('user.userId', userId)
            .range(page * count, page * count + count - 1)
            .order('created_at', { ascending: false })
            .returns<FullHistory[]>();
    }

    async fetchCurrentPaymentForUser(userId: string): Promise<PostgrestSingleResponse<any[]>> {
        return this.client
            .from(TABLE_PAYMENTS)
            .select("*")
            .eq("userId", userId)
            .eq("paymentState", "Open")
            .returns<Payment[]>();
    }

    async insertNewPayment(userId: string): Promise<PostgrestSingleResponse<PaymentInsert>> {
        return this.client.from(TABLE_PAYMENTS)
            .insert({
                userId: userId,
                paymentState: "Open"
            })
            .select()
            .returns<PaymentInsert>()
            .single();
    }

    async fetchOpenDrinksForUser(userId: string): Promise<PostgrestSingleResponse<FullHistory[]>> {
        const query = this.client
            .from(TABLE_HISTORY)
            .select("*, drink ( price, name ), payment(*)")
            .eq("user ", userId)
            .eq("payment.paymentState", "Open" as PaymentState)
            .returns<FullHistory[]>();

        return query;
    }

    async insertHistoryItems(drinks: DrinkCounter[], userId: string, paymentId: number): Promise<PostgrestSingleResponse<any>> {
        const query = this.client
            .from(TABLE_HISTORY)
            .insert(drinks.map((drink) => {
                return {
                    user: userId,
                    drink: drink.id,
                    count: drink.count,
                    payment: paymentId,
                    amount: drink.count * (drink.price ?? 1)
                }
            }));

        return query;
    }

    async updateHistoryItem(id: number, count: number, amount: number): Promise<PostgrestSingleResponse<any>> {
        return this.client
            .from(TABLE_HISTORY)
            .update({ count: count, amount: amount })
            .eq("id", id)
    }

    async fetchDrinksToPay(userId: string): Promise<PostgrestSingleResponse<PaymentHistory[]>> {
        return this.client
            .from(TABLE_HISTORY)
            .select("id, count, created_at, user, amount, drink ( name, price ), payments ( paymentState )")
            .eq('payments.paymentState', "Open")
            .not("payments", "is", null)
            .eq('user', userId)
            .returns<PaymentHistory[]>()
    }

    async fetchDrinks(): Promise<PostgrestSingleResponse<Drink[]>> {
        return this.client.from(TABLE_DRINK).select("*")
            .order('id', { ascending: false })
            .returns<Drink[]>();
    }

}