import { supabase } from '@/lib/supabase';
import { DrinkCounter, PaymentHistory } from '@/types/supabaseTypes';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import _ from 'lodash';

export const fetchFullHistory = () => supabase.from('history').select('*, drinkId: drink, drink(*), user(*)');

export const DrinkRepository = {
  async insertHistoryItems(drinks: DrinkCounter[]): Promise<PostgrestSingleResponse<undefined>> {
    const drinksToAdd = drinks.map((x) => ({ id: x.id, count: x.count, price: x.price }));
    return supabase.rpc('add_drinks_history', { items: drinksToAdd }).throwOnError();
  },

  async fetchAllDrinks(): Promise<Drink[]> {
    const result = await supabase.from('drink').select('*').throwOnError();
    return result.data ?? [];
  },

  async fetchPaymentHistory(userId: string): Promise<PaymentHistory[]> {
    const result = await supabase
      .from('history')
      .select('*, drink ( id, name, price ), payments ( paymentState ), voucher')
      .eq('payments.paymentState', 'Open')
      .not('payments', 'is', null)
      .eq('user', userId)
      .returns<PaymentHistory[]>()
      .throwOnError();
    return result.data ?? [];
  },

  async fetchVouchers() {
    const result = await supabase.from('user_vouchers').select('*').throwOnError();
    return result.data ?? [];
  },

  async fetchDrinks(): Promise<Drink[]> {
    const result = await supabase
      .from('drink')
      .select('*')
      .order('id', { ascending: false })
      .returns<Drink[]>()
      .throwOnError();
    return result.data ?? [];
  },

  async fetchUserHistoryPage(userId: string, count: number, pageParam: number): Promise<{ data: FullHistory[]; nextPage: number | undefined }> {
    const { data } = await fetchFullHistory()
      .not('user', 'is', null)
      .eq('user.id', userId)
      .range(pageParam * count, pageParam * count + count - 1)
      .order('created_at', { ascending: false })
      .returns<FullHistory[]>()
      .throwOnError();
    const hasMore = (data?.length ?? 0) === count;
    return { data: data ?? [], nextPage: hasMore ? pageParam + 1 : undefined };
  },

  async deleteDrink(drinkId: string) {
    return supabase.from('drink').delete().eq('id', drinkId).throwOnError();
  },

  async insertDrink(drink: Drink) {
    return supabase.from('drink').insert(_.omit(drink, ['id'])).throwOnError();
  },

  async updateDrink(drink: Drink) {
    return supabase.from('drink').update(_.omit(drink, ['id'])).eq('id', drink.id).throwOnError();
  },

  async updateHistoryEntry(entryId: number, count: number, amount: number) {
    return supabase.from('history').update({ count, amount }).eq('id', entryId).throwOnError();
  },
};
