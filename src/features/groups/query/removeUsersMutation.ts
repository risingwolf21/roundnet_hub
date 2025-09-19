import { queryClient } from '@/lib/queryClient';
import { AdminUsersRepository } from '@/repository/AdminUsersRepository';
import { GroupWithUserMappings } from '@/types/supabaseTypes';
import { useMutation } from '@tanstack/react-query';

export const useRemoveUsersMutation = (group: Group | null) =>
  useMutation({
    mutationFn: (users: User[]) => {
      if (!group) {
        return Promise.resolve(null);
      }
      return AdminUsersRepository.removeUsersFromGroup(group, users);
    },
    onMutate: async (usersToRemove: User[] | null) => {
      if (!group) return null;

      await queryClient.cancelQueries({ queryKey: ['group', group.id] });

      const previousGroup = queryClient.getQueryData<GroupWithUserMappings>(['group', group.id]);

      if (!usersToRemove) return { previousGroup };

      if (previousGroup) {
        queryClient.setQueryData<GroupWithUserMappings>(['group', group.id], {
          ...previousGroup,
          users: previousGroup.users.filter((x) => !usersToRemove.map((x) => x.userId).includes(x.user.userId)),
        });
      }

      return { previousGroup };
    },
    onError: (err, variables, context) => {
      if (context?.previousGroup && group) {
        queryClient.setQueryData(['group', group.id], context.previousGroup);
      }
    },
    onSettled: () => {
      if (group) queryClient.invalidateQueries({ queryKey: ['group', group.id] });
    },
  });
