import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "src/App";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { SupabaseKeysRepository } from "src/repository/KeysRepository";
import { TablesInsert, TablesUpdate } from "src/types/supabase-generated.types";
import { formatDateToDatabase } from "src/utils";

export const useAllItems = () => useQuery<FullItemHolder[]>({
  queryKey: ["items"],
  queryFn: () => SupabaseKeysRepository.getItems()
})

export const useItemHistory = (id: number) => useQuery<FullItemHistory[]>({
  queryKey: ["items", id, "history"],
  queryFn: () => SupabaseKeysRepository.loadKeyHistory(id)
})

export const useHandoverKeyMutation = () => useMutation({
  mutationFn: async ({ keyHolder, user }: { keyHolder: FullItemHolder, user: User }) => {
    return SupabaseKeysRepository.giveItemToUser(keyHolder, user);
  },
  onMutate: async ({ keyHolder, user }) => {
    await queryClient.cancelQueries({ queryKey: ['items'] });
    await queryClient.cancelQueries({ queryKey: ['items', keyHolder.id, 'history'] });

    const previousItemHolders = queryClient.getQueryData<FullItemHolder[]>(['items']);
    const previousItemHistory = queryClient.getQueryData<FullItemHistory[]>(['items', keyHolder.id, 'history']);

    if (previousItemHolders) {
      const newItemHolders = previousItemHolders.map(x => {
        if (x.full_current_holder?.userId === keyHolder.full_current_holder?.userId) {
          return {
            ...keyHolder,
            full_current_holder: user,
            current_holder: user.userId,
            lastUpdate: formatDateToDatabase(new Date())
          }
        } else {
          return x;
        }
      })
      queryClient.setQueryData<FullItemHolder[]>(['items'], newItemHolders);
    }

    if (previousItemHistory) {
      const newItemHistory = [
        ...previousItemHistory,
        {
          created_at: formatDateToDatabase(new Date()),
          currentUser: user,
          key: {
            ...keyHolder
          },
          pastUser: keyHolder.full_current_holder
        }
      ] as FullItemHistory[]
      queryClient.setQueryData<FullItemHistory[]>(['items', keyHolder.id, 'history'], newItemHistory);
    }

    return { previousItemHolders, previousItemHistory, itemId: keyHolder.id };
  },
  onError: (_e, _v, context) => {
    if (context?.previousItemHolders) {
      queryClient.setQueryData(['items'], context.previousItemHolders);
    }
    if (context?.previousItemHistory && context?.itemId) {
      queryClient.setQueryData(['items', context.itemId, 'history'], context.previousItemHistory);
    }
  },
  onSettled: (_d, _e, _v, context) => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
    if (context?.itemId) {
      queryClient.invalidateQueries({ queryKey: ['items', context.itemId, 'history'] });
    }
  },
})

export const useUpdateItemMutation = () => useMutation({
  mutationFn: async ({ item }: { item: TablesUpdate<'items'> & { id: number } }) => {
    const result = await supabase
      .rpc("edit_item", {
        p_color: item.color,
        p_id: item.id,
        p_name: item.name,
        p_type: item.type
      })
      .throwOnError();

    return result.data;
  },
  onMutate: async ({ item }) => {
    await queryClient.cancelQueries({ queryKey: ['items'] });

    const previousItemHolders = queryClient.getQueryData<FullItemHolder[]>(['items']);

    if (previousItemHolders) {
      const newItemHolders = previousItemHolders.map(x => {
        if (x.id === item.id) {
          return {
            ...x,
            ...item,
            id: item.id
          }
        } else {
          return x;
        }
      })
      queryClient.setQueryData<FullItemHolder[]>(['items'], newItemHolders);
    }

    return { previousItemHolders };
  },
  onError: (_e, _v, context) => {
    if (context?.previousItemHolders) {
      queryClient.setQueryData(['items'], context.previousItemHolders);
    }
  },
  onSettled: (_d, _e, _v, context) => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
  },
})

export const useInsertItemMutation = () => useMutation({
  mutationFn: async ({ item }: { item: TablesInsert<'items'> }) => {
    const result = await supabase
      .from('items')
      .insert(item)
      .select()
      .single()
      .throwOnError();

    return result.data;
  },
  onMutate: async ({ item }) => {
    await queryClient.cancelQueries({ queryKey: ['items'] });

    const previousItemHolders = queryClient.getQueryData<FullItemHolder[]>(['items']);

    if (previousItemHolders) {
      const newItemHolders = [
        ...previousItemHolders,
        {
          ...item
        }
      ] as FullItemHolder[]
      queryClient.setQueryData<FullItemHolder[]>(['items'], newItemHolders);
    }

    return { previousItemHolders };
  },
  onError: (_e, _v, context) => {
    if (context?.previousItemHolders) {
      queryClient.setQueryData(['items'], context.previousItemHolders);
    }
  },
  onSettled: (_d, _e, _v, context) => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
  },
})