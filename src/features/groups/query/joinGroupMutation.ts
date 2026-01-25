import { queryClient } from '@/lib/queryClient';
import { GroupsRepository } from '@/repository/GroupsRepository';
import { groupKeys } from '@/tanstack/groups';
import { GroupWithUserMappings } from '@/types/supabaseTypes';
import { useMutation } from '@tanstack/react-query';

export const useJoinGroup = (groupId: string, user: User, role: 'user' | 'admin' | 'joinRequested') => {
  return useMutation({
    mutationFn: async () => {
      const result = await GroupsRepository.addUserToGroup(groupId, user.id, role);

      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: groupKeys.single(groupId) });
      await queryClient.cancelQueries({ queryKey: groupKeys.all });

      const prevGroup = queryClient.getQueryData(groupKeys.single(groupId));
      const prevGroups = queryClient.getQueryData(groupKeys.all);
      queryClient.setQueryData(groupKeys.single(groupId), (old: GroupWithUserMappings) => ({
        ...old,
        users: [
          ...old.users,
          {
            user: user,
            map: {
              group: groupId,
              role: role,
              user: user.id,
            },
          },
        ],
      }));

      queryClient.setQueryData(groupKeys.all, (old: GroupWithUserMappings[]) =>
        old.map((group) =>
          group.id === groupId
            ? {
              ...group,
              users: [
                ...group.users,
                {
                  user: user,
                  map: {
                    group: groupId,
                    role: role,
                    user: user.id,
                  },
                },
              ],
            }
            : group
        )
      );

      return { prevGroup, prevGroups };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(groupKeys.single(groupId), context?.prevGroup);
      queryClient.setQueryData(groupKeys.all, context?.prevGroups);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.single(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.all });
    },
  });
};
