import { PostgrestSingleResponse } from '@supabase/supabase-js';
import _ from 'lodash';
import { supabase } from '../components/services/supabase/supabaseClient';
import { fetchDrink, fetchFullHistory } from './DrinkRepository';

export const AdminDrinksRepository = {
  async fetchDrinks(): Promise<PostgrestSingleResponse<Drink[]>> {
    return fetchDrink().throwOnError();
  },

  async fetchAdminHistory(page: number = 0, count: number = 20): Promise<PostgrestSingleResponse<FullHistory[]>> {
    return fetchFullHistory()
      .order('created_at', { ascending: false })
      .range(page * count, page * count + count - 1)
      .throwOnError();
  },

  async updateDrink(drink: Drink): Promise<PostgrestSingleResponse<null>> {
    return supabase.from('drink').update(drink).eq('id', drink.id).throwOnError();
  },

  async deleteDrink(id: number): Promise<PostgrestSingleResponse<null>> {
    return supabase.from('drink').delete().eq('id', id).throwOnError();
  },

  async addDrink(drink: Drink): Promise<PostgrestSingleResponse<null>> {
    return supabase
      .from('drink')
      .insert(_.omit(drink, ['id']))
      .throwOnError();
  },
};
