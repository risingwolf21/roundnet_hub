import { queryClient } from '@/lib/queryClient';
import { AdminUsersRepository } from '@/repository/AdminUsersRepository';
import { groupKeys } from '@/tanstack/groups';
import { GroupWithUserMappings } from '@/types/supabaseTypes';
import { useMutation } from '@tanstack/react-query';

export const useRemoveUsersMutation = (group: Group | null) =>
  useMutation({
    mutationFn: ({ users }: { users: User[] }) => {
      if (!group) {
        return Promise.resolve(null);
      }
      return AdminUsersRepository.removeUsersFromGroup(group, users);
    },
    onMutate: async ({ users }) => {
      if (!group) return null;

      await queryClient.cancelQueries({ queryKey: groupKeys.single(group.id) });

      const previousGroup = queryClient.getQueryData<GroupWithUserMappings>(groupKeys.single(group.id));

      if (!users) return { previousGroup };

      if (previousGroup) {
        queryClient.setQueryData<GroupWithUserMappings>(groupKeys.single(group.id), {
          ...previousGroup,
          users: previousGroup.users.filter((x) => !users.map((x) => x.id).includes(x.user.id)),
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
