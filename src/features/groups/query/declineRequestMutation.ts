import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { groupKeys } from '@/tanstack/groups';
import { FullUserMapping, GroupWithUserMappings } from '@/types/supabaseTypes';
import { useMutation } from '@tanstack/react-query';

export const useDeclineRequestMutation = (group: Group | null) =>
  useMutation({
    mutationFn: async (user: User) => {
      if (!group) {
        return Promise.resolve(null);
      }
      const result = await supabase
        .from('group_user_mapping')
        .delete()
        .eq('group', group.id)
        .eq('user', user.id)
        .eq('role', 'joinRequested')
        .throwOnError();

      return result.data;
    },
    onMutate: async (user: User) => {
      if (!group) return null;

      await queryClient.cancelQueries({ queryKey: groupKeys.single(group.id) });
      await queryClient.cancelQueries({ queryKey: groupKeys.joinRequested() });

      const previousGroup = queryClient.getQueryData<GroupWithUserMappings>(groupKeys.single(group.id));
      const previousRequested = queryClient.getQueryData<GroupUserMapping[]>(groupKeys.joinRequested());
      if (previousGroup) {
        queryClient.setQueryData<GroupWithUserMappings>(['group', group.id], {
          ...previousGroup,
          users: previousGroup.users.filter((x: FullUserMapping) => x.user.id === user.id),
        });
      }

      if (previousRequested) {
        queryClient.setQueryData<GroupUserMapping[]>(
          ['groups', 'joinRequested'],
          previousRequested.filter((x) => x.user !== user.id && x.group !== group.id)
        );
      }

      return { previousGroup, previousRequested };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousGroup && group) {
        queryClient.setQueryData(groupKeys.single(group.id), context.previousGroup);
      }
      if (context?.previousRequested) {
        queryClient.setQueryData(groupKeys.joinRequested(), context.previousRequested);
      }
    },
    onSettled: () => {
      if (group) queryClient.invalidateQueries({ queryKey: groupKeys.single(group.id) });
      queryClient.invalidateQueries({ queryKey: groupKeys.joinRequested() });
    },
  });
