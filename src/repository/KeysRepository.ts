import { supabase } from 'src/lib/supabase';

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

  async getItems(): Promise<FullItemHolder[]> {
    const result = await fetchItems().throwOnError();

    return result.data ?? []
  },

  async giveItemToUser(key: Item, user: User): Promise<null> {
    await supabase
      .rpc("key_handover", {
        p_key_id: key.id,
        p_new_holder: user.userId
      })
      .throwOnError();

    return null;
  },
};
