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
  ): Promise<{ data: FullHistory[], nextPage?: number }> {
    const { data } = await fetchFullHistory()
      .not('user', 'is', null)
      .eq('user.userId', userId)
      .range(page * count, page * count + count - 1)
      .order('created_at', { ascending: false })
      .returns<FullHistory[]>()
      .throwOnError();

    const hasMore = (data?.length ?? 0) === count

    return {
      data: data ?? [],
      nextPage: hasMore ? page + 1 : undefined,
    }
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
      .eq('payments.paymentState', 'Open' as PaymentState)
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

  async fetchDrinksToPay(userId: string): Promise<PaymentHistory[]> {
    const result = await fetchDrinksToPay()
      .eq('payments.paymentState', 'Open')
      .not('payments', 'is', null)
      .eq('user', userId)
      .returns<PaymentHistory[]>()
      .throwOnError();

    return result.data ?? [];
  },

  async fetchDrinks(): Promise<Drink[]> {
    const result = await fetchDrink().order('id', { ascending: false }).returns<Drink[]>().throwOnError();

    return result.data ?? []
  },

  async fetchVouchersForUser(): Promise<Tables<'user_vouchers'>[]> {
    const result = await supabase.from('user_vouchers').select('*').returns<Tables<'user_vouchers'>[]>().throwOnError();

    return result.data ?? [];
  },
};
