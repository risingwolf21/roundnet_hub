import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { groupKeys } from '@/tanstack/groups';
import { GroupWithUserMappings } from '@/types/supabaseTypes';
import { useMutation } from '@tanstack/react-query';

export const useAddUsersMutation = (group: Group | null) =>
  useMutation({
    mutationFn: async ({ newUsers }: { newUsers: User[] }) => {
      if (!group) {
        return Promise.resolve([]);
      }
      const result = await supabase
        .from('group_user_mapping')
        .upsert(
          newUsers.map((x) => ({
            user: x.id,
            group: group.id,
            role: "user" as GroupRole,
          }))
        )
        .select('*')
        .throwOnError();

      return result.data ?? [];
    },
    onMutate: async ({ newUsers }) => {
      if (!group) return null;

      await queryClient.cancelQueries({ queryKey: groupKeys.single(group.id) });

      const previousGroup = queryClient.getQueryData<GroupWithUserMappings>(groupKeys.single(group.id));

      if (!newUsers) return { previousGroup };

      if (previousGroup) {
        queryClient.setQueryData<GroupWithUserMappings>(groupKeys.single(group.id), {
          ...previousGroup,
          users: [
            ...previousGroup.users,
            ...newUsers.map((user) => ({
              user,
              map: { group: group.id, user: user.id, role: 'user' } as GroupUserMapping,
            })),
          ],
        });
      }

      return { previousGroup };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousGroup && group) {
        queryClient.setQueryData(groupKeys.single(group.id), context.previousGroup);
      }
    },
    onSettled: () => {
      if (group) queryClient.invalidateQueries({ queryKey: groupKeys.single(group.id) });
    },
  });
