import { supabase } from '@/lib/supabase';

export const fetchItems = () => supabase.from('items').select('*, full_current_holder: user!items_current_holder_fkey(*)');
export const fetchItemHistory = () =>
  supabase
    .from('item_history')
    .select(
      '*, past_user: user!item_history_past_user_uuid_fkey(*), current_user: user!item_history_current_user_uuid_fkey(*), key: key(*)'
    );

export const SupabaseKeysRepository = {
  async loadKeyHistory(keyId: number): Promise<FullItemHistory[]> {
    const result = await fetchItemHistory()
      .eq('key.id', keyId)
      .not('key', 'is', null)
      .not('past_user', 'is', null)
      .not('current_user', 'is', null)
      .order('created_at', { ascending: false })
      .returns<FullItemHistory[]>()
      .throwOnError();

    return result.data ?? [];
  },

  async getItems(): Promise<FullItemHolder[]> {
    const result = await fetchItems().throwOnError();

    return result.data ?? [];
  },

  async giveItemToUser(key: Item, user: User): Promise<null> {
    await supabase
      .rpc('key_handover', {
        p_key_id: key.id,
        p_new_holder: user.id,
      })
      .throwOnError();

    return null;
  },
};
