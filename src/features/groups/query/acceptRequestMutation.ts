import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { FullUserMapping, GroupWithUserMappings } from '@/types/supabaseTypes';
import { useMutation } from '@tanstack/react-query';

export const useAcceptRequestMutation = (group: Group | null) =>
  useMutation({
    mutationFn: async (user: User) => {
      if (!group) {
        return Promise.resolve(null);
      }
      const result = await supabase
        .from('group_user_mapping')
        .update({ role: 'user' })
        .eq('group', group.id)
        .eq('user', user.id)
        .eq('role', 'joinRequested')
        .select('*')
        .throwOnError();

      return result.data;
    },
    onMutate: async (user: User) => {
      if (!group) return null;

      await queryClient.cancelQueries({ queryKey: ['group', group.id] });
      await queryClient.cancelQueries({ queryKey: ['group', 'joinRequested'] });

      const previousGroup = queryClient.getQueryData<GroupWithUserMappings>(['group', group.id]);
      const previousRequested = queryClient.getQueryData<GroupUserMapping[]>(['group', 'joinRequested']);

      if (previousGroup) {
        queryClient.setQueryData<GroupWithUserMappings>(['group', group.id], {
          ...previousGroup,
          users: [
            ...previousGroup.users.map((x: FullUserMapping) => {
              if (x.user.id === user.id) {
                return {
                  user: user,
                  map: {
                    group: group.id,
                    role: 'user',
                    user: user.id,
                  },
                } as FullUserMapping;
              } else {
                return x;
              }
            }),
          ],
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
        queryClient.setQueryData(['group', group.id], context.previousGroup);
      }
      if (context?.previousRequested) {
        queryClient.setQueryData(['group', 'joinRequested'], context.previousRequested);
      }
    },
    onSettled: () => {
      if (group) queryClient.invalidateQueries({ queryKey: ['group', group.id] });
      queryClient.invalidateQueries({ queryKey: ['group', 'joinRequested'] });
    },
  });
