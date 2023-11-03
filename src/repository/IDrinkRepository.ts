import { injectable } from "inversify";
import { SupabaseRepository } from "./Repository";
import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { Drink, DrinkCounter, FullHistory, History, PaymentHistory, PaymentState } from "../types/supabaseTypes";
import { TABLE_DRINK, TABLE_HISTORY, TABLE_PAYMENTS } from "../constants";
import { DrinkStockType } from "../components/procure/AnalyzeDrinkStockHistory";

export interface IDrinkRepository {
    fetchDrinksToPay(userId: string): Promise<PostgrestSingleResponse<PaymentHistory[]> | null>
    fetchDrinks(): Promise<PostgrestSingleResponse<Drink[]> | null>
    fetchHistoryForUser(userId: string, page: number, count: number): Promise<PostgrestSingleResponse<FullHistory[]> | null>
    fetchOpenDrinksForUser(userId: string): Promise<PostgrestSingleResponse<FullHistory[]> | null>
    fetchCurrentPaymentForUser(userId: string): Promise<PostgrestSingleResponse<any[]> | null>
    insertHistoryItems(drinks: DrinkCounter[], userId: string, paymentId: number): Promise<PostgrestSingleResponse<any> | null>
    updateHistoryItem(id: number, count: number, amount: number): Promise<PostgrestSingleResponse<any> | null>
    insertNewPayment(userId: string): Promise<PostgrestSingleResponse<any[]> | null>
    updateDrinkStock(drinkId: number, stock: number): Promise<PostgrestSingleResponse<any>>
    fetchHistoryStockType(): Promise<PostgrestSingleResponse<any> | null>
}

@injectable()
export class SupabaseDrinkRepository extends SupabaseRepository implements IDrinkRepository {
    async fetchHistoryStockType(): Promise<PostgrestSingleResponse<any> | null> {
        if (!this.client)
            throw Error("SupabaseClient was undefined.");

        return this.client
            .from(TABLE_HISTORY)
            .select("count, amount, created_at, drink (id, name, price, stock), user(displayName)")
            .returns<DrinkStockType[]>()
            .order('id', { ascending: false })
    }
    async updateDrinkStock(drinkId: number, stock: number): Promise<PostgrestSingleResponse<any>> {
        if (!this.client)
            throw Error("SupabaseClient was undefined.");

        return this.client.from(TABLE_DRINK)
            .update({ stock }).eq("id", drinkId)
    }

    async fetchHistoryForUser(userId: string, page: number = 0, count: number = 20): Promise<PostgrestSingleResponse<FullHistory[]> | null> {
        if (!this.client)
            throw Error("SupabaseClient was undefined.");

        return this.client
            .from(TABLE_HISTORY)
            .select('id, count, amount, created_at, drinkId: drink, drink(*), user(*)')
            .not("user", "is", null)
            .eq('user.userId', userId)
            .range(page * count, page * count + count - 1)
            .order('created_at', { ascending: false })
            .returns<FullHistory[]>();
    }

    async fetchCurrentPaymentForUser(userId: string): Promise<PostgrestSingleResponse<any[]> | null> {
        if (!this.client)
            throw Error("SupabaseClient was undefined.");

        return this.client
            .from(TABLE_PAYMENTS)
            .select("*")
            .eq("userId", userId)
            .eq("paymentState", "Open");
    }

    async insertNewPayment(userId: string): Promise<PostgrestSingleResponse<any[]> | null> {
        if (!this.client)
            throw Error("SupabaseClient was undefined.");

        return this.client.from(TABLE_PAYMENTS).insert({
            userId: userId,
            paymentState: "Open"
        }).select().single();
    }

    async fetchOpenDrinksForUser(userId: string): Promise<PostgrestSingleResponse<FullHistory[]> | null> {
        if (!this.client)
            throw Error("SupabaseClient was undefined.");

        const query = this.client
            .from(TABLE_HISTORY)
            .select("*, drink ( price, name ), payment(*)")
            .eq("user ", userId)
            .eq("payment.paymentState", "Open" as PaymentState)
            .returns<FullHistory[]>();

        return query;
    }

    async insertHistoryItems(drinks: DrinkCounter[], userId: string, paymentId: number): Promise<PostgrestSingleResponse<any>> {
        if (!this.client)
            throw Error("SupabaseClient was undefined.");

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

    async updateHistoryItem(id: number, count: number, amount: number): Promise<PostgrestSingleResponse<any> | null> {
        if (!this.client)
            throw Error("SupabaseClient was undefined.");

        return this.client
            .from(TABLE_HISTORY)
            .update({ count: count, amount: amount })
            .eq("id", id)
    }

    async fetchDrinksToPay(userId: string): Promise<PostgrestSingleResponse<PaymentHistory[]> | null> {
        if (!this.client)
            throw Error("SupabaseClient was undefined.");

        return this.client
            .from(TABLE_HISTORY)
            .select("id, count, created_at, user, amount, drink ( name, price ), payments ( paymentState )")
            .eq('payments.paymentState', "Open")
            .not("payments", "is", null)
            .eq('user', userId)
            .returns<PaymentHistory[]>()
    }

    async fetchDrinks(): Promise<PostgrestSingleResponse<Drink[]> | null> {
        if (!this.client)
            throw Error("SupabaseClient was undefined.");

        return this.client.from(TABLE_DRINK).select("*")
            .order('id', { ascending: false })
            .returns<Drink[]>();
    }

}