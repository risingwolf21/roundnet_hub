import { supabase } from '@/lib/supabase';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import _ from 'lodash';
import { fetchFullHistory } from './DrinkRepository';


const PAGE_SIZE = 20;

export const AdminDrinksRepository = {
  async fetchAdminHistory({ pageParam = 0 }: { pageParam?: number }) {
    const from = pageParam * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await fetchFullHistory()
      .order('created_at', { ascending: false })
      .range(from, to)
      .returns<FullHistory[]>()
      .throwOnError();

    const hasMore = (data?.length ?? 0) === PAGE_SIZE;

    return {
      data: data ?? [],
      nextPage: hasMore ? pageParam + 1 : undefined,
    };
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
