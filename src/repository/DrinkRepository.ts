import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { DrinkCounter, FullHistory, PaymentHistory } from '../types/supabaseTypes';
import { supabase } from '../components/services/supabase/supabaseClient';
import { Tables } from '../types/supabase-generated.types';

export const SupabaseDrinkRepository = {
  async updateDrinkStock(drinkId: number, stock: number): Promise<PostgrestSingleResponse<any>> {
    return supabase.from('drink').update({ stock }).eq('id', drinkId).throwOnError();
  },

  async fetchHistoryForUser(
    userId: string,
    page: number = 0,
    count: number = 20
  ): Promise<PostgrestSingleResponse<FullHistory[]>> {
    return supabase
      .from('history')
      .select('id, count, amount, created_at, drinkId: drink, drink(*), user(*)')
      .not('user', 'is', null)
      .eq('user.userId', userId)
      .range(page * count, page * count + count - 1)
      .order('created_at', { ascending: false })
      .returns<FullHistory[]>()
      .throwOnError();
  },

  async fetchCurrentPaymentForUser(userId: string): Promise<PostgrestSingleResponse<any[]>> {
    return supabase
      .from('payments')
      .select('*')
      .eq('userId', userId)
      .eq('paymentState', 'Open')
      .returns<Payment[]>()
      .throwOnError();
  },

  async fetchOpenDrinksForUser(userId: string): Promise<PostgrestSingleResponse<FullHistory[]>> {
    return supabase
      .from('history')
      .select('*, drink ( price, name ), payment(*)')
      .eq('user ', userId)
      .eq('payment.paymentState', 'Open' as PaymentState)
      .returns<FullHistory[]>()
      .throwOnError();
  },

  async insertHistoryItems(drinks: DrinkCounter[]): Promise<PostgrestSingleResponse<undefined>> {
    const drinksToAdd = drinks.map((x) => ({ id: x.id, count: x.count, price: x.price }));
    return supabase.rpc('add_drinks_history', { items: drinksToAdd }).throwOnError();
  },

  async updateHistoryItem(id: number, count: number, amount: number): Promise<PostgrestSingleResponse<any>> {
    return supabase.from('history').update({ count: count, amount: amount }).eq('id', id).throwOnError();
  },

  async fetchDrinksToPay(userId: string): Promise<PostgrestSingleResponse<PaymentHistory[]>> {
    return supabase
      .from('history')
      .select('id, count, created_at, user, amount, drink ( name, price ), payments ( paymentState ), voucher')
      .eq('payments.paymentState', 'Open')
      .not('payments', 'is', null)
      .eq('user', userId)
      .returns<PaymentHistory[]>()
      .throwOnError();
  },

  async fetchDrinks(): Promise<PostgrestSingleResponse<Drink[]>> {
    return supabase.from('drink').select('*').order('id', { ascending: false }).returns<Drink[]>().throwOnError();
  },

  async fetchVouchersForUser(): Promise<PostgrestSingleResponse<Tables<'user_vouchers'>[]>> {
    return supabase.from('user_vouchers').select('*').returns<Tables<'user_vouchers'>[]>().throwOnError();
  },
};
