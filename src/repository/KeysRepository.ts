import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { supabase } from '../components/services/supabase/supabaseClient';
import { TablesInsert, TablesUpdate } from '../types/supabase-generated.types';
import { formatDateToDatabase } from '../utils';

export const fetchItems = () => supabase.from('items').select('*, full_current_holder: user!keys_user_fkey(*)')
export const fetchItemHistory = () => supabase
  .from('item_history')
  .select(
    '*, pastUser: user!item_history_pastUser_fkey(*), currentUser: user!item_history_currentUser_fkey(*), key: key(*)'
  )

export const SupabaseKeysRepository = {
  async loadKeyHistory(keyId: number): Promise<FullItemHistory[]> {
    const result = await fetchItemHistory()
      .eq('key.id', keyId)
      .not('key', 'is', null)
      .not('pastUser', 'is', null)
      .not('currentUser', 'is', null)
      .order('created_at', { ascending: false })
      .returns<FullItemHistory[]>()
      .throwOnError();

    return result.data ?? [];
  },

  async updateItem(item: TablesUpdate<'items'>, id: number): Promise<PostgrestSingleResponse<Item>> {
    return supabase.from('items').update(item).eq('id', id).select().single();
  },

  async insertItem(item: TablesInsert<'items'>): Promise<PostgrestSingleResponse<Item>> {
    return supabase.from('items').insert(item).select().single();
  },

  async getItems(): Promise<FullItemHolder[]> {
    const result = await fetchItems().throwOnError();

    return result.data ?? []
  },

  async giveItemToUser(key: Item, user: User): Promise<null> {
    const result = await supabase
      .from('items')
      .update({
        current_holder: user.userId,
        lastUpdate: formatDateToDatabase(new Date()),
      })
      .eq('id', key.id)
      .throwOnError();

    return result.data;
  },

  async fetchInsertedItem(key: number, user: string): Promise<PostgrestSingleResponse<FullItemHolder[]>> {
    return supabase
      .from('items')
      .select('*, user: user(*)')
      .eq('id', key)
      .eq('user.userId', user)
      .returns<FullItemHolder[]>();
  },
};
