import { supabase } from '@/lib/supabase';
import { TablesInsert, TablesUpdate } from '@/types/supabase-generated.types';

export const fetchItems = () =>
  supabase.from('items').select('*, full_current_holder: user!items_current_holder_fkey(*)');
export const fetchItemHistory = () =>
  supabase
    .from('item_history')
    .select(
      '*, past_user: user!item_history_past_user_uuid_fkey(*), current_user: user!item_history_current_user_uuid_fkey(*), key: key(*)'
    );

export const KeysRepository = {
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

  async updateItem(item: TablesUpdate<'items'> & { id: number }) {
    const result = await supabase
      .rpc('edit_item', {
        p_color: item.color,
        p_id: item.id,
        p_name: item.name,
        p_type: item.type,
        // group: undefined = leave as is, null = visible to everyone, id = only for that group.
        p_group: item.group ?? undefined,
        p_set_group: item.group !== undefined,
      })
      .throwOnError();
    return result.data;
  },

  async insertItem(item: TablesInsert<'items'>) {
    const result = await supabase.from('items').insert(item).select().single().throwOnError();
    return result.data;
  },
};
