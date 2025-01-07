import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase } from '../components/services/supabase/supabaseClient';
import { DrinkCounter, PaymentHistory } from '../types/supabaseTypes';
import { Tables } from 'src/types/supabase-generated.types';

export const fetchDrink = () => supabase.from('drink').select('*');

export const fetchFullHistory = () => supabase
  .from('history')
  .select('*, drinkId: drink, drink(*), user(*)');

export const fetchDrinksToPay = () => supabase
  .from('history')
  .select('*, drink ( name, price ), payments ( paymentState ), voucher');

export const SupabaseDrinkRepository = {
  async fetchHistoryForUser(
    userId: string,
    page: number = 0,
    count: number = 20
  ): Promise<PostgrestSingleResponse<FullHistory[]>> {
    return fetchFullHistory()
      .not('user', 'is', null)
      .eq('user.userId', userId)
      .range(page * count, page * count + count - 1)
      .order('created_at', { ascending: false })
      .returns<FullHistory[]>()
      .throwOnError();
  },

  async fetchCurrentPaymentForUser(userId: string): Promise<PostgrestSingleResponse<Payment[]>> {
    return supabase
      .from('payments')
      .select('*')
      .eq('userId', userId)
      .eq('paymentState', 'Open')
      .returns<Payment[]>()
      .throwOnError();
  },

  async fetchOpenDrinksForUser(userId: string): Promise<PostgrestSingleResponse<OpenDrinksForUser[]>> {
    return fetchDrinksToPay()
      .eq('user ', userId)
      .eq('payment.paymentState', 'Open' as PaymentState)
      .returns<OpenDrinksForUser[]>()
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
    return fetchDrinksToPay()
      .eq('payments.paymentState', 'Open')
      .not('payments', 'is', null)
      .eq('user', userId)
      .returns<PaymentHistory[]>()
      .throwOnError();
  },

  async fetchDrinks(): Promise<PostgrestSingleResponse<Drink[]>> {
    return fetchDrink().order('id', { ascending: false }).returns<Drink[]>().throwOnError();
  },

  async fetchVouchersForUser(): Promise<PostgrestSingleResponse<Tables<'user_vouchers'>[]>> {
    return supabase.from('user_vouchers').select('*').returns<Tables<'user_vouchers'>[]>().throwOnError();
  },
};
