import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase } from '../components/services/supabase/supabaseClient';
import { DrinkCounter } from '../types/supabaseTypes';

export const fetchFullHistory = () => supabase
  .from('history')
  .select('*, drinkId: drink, drink(*), user(*)');

export const SupabaseDrinkRepository = {

  async insertHistoryItems(drinks: DrinkCounter[]): Promise<PostgrestSingleResponse<undefined>> {
    const drinksToAdd = drinks.map((x) => ({ id: x.id, count: x.count, price: x.price }));
    return supabase.rpc('add_drinks_history', { items: drinksToAdd }).throwOnError();
  },
};
