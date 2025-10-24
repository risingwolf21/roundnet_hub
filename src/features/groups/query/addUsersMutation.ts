import { queryClient } from '@/lib/queryClient';
import { AdminUsersRepository } from '@/repository/AdminUsersRepository';
import { GroupWithUserMappings } from '@/types/supabaseTypes';
import { useMutation } from '@tanstack/react-query';


export const useAddUsersMutation = (group: Group | null) =>
  useMutation({
    mutationFn: (users: User[]) => {
      if (!group) {
        return Promise.resolve([]);
      }
      return AdminUsersRepository.addUsersToGroup(group, users);
    },
    onMutate: async (newUsers: User[] | null) => {
      if (!group) return null;

      await queryClient.cancelQueries({ queryKey: ['group', group.id] });

      const previousGroup = queryClient.getQueryData<GroupWithUserMappings>(['group', group.id]);

      if (!newUsers) return { previousGroup };

      if (previousGroup) {
        queryClient.setQueryData<GroupWithUserMappings>(['group', group.id], {
          ...previousGroup,
          users: [
            ...previousGroup.users,
            ...newUsers.map((user) => ({
              user,
              map: { group: group.id, user: user.userId, role: 'user' } as GroupUserMapping,
            })),
          ],
        });
      }

      return { previousGroup };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousGroup && group) {
        queryClient.setQueryData(['group', group.id], context.previousGroup);
      }
    },
    onSettled: () => {
      if (group) queryClient.invalidateQueries({ queryKey: ['group', group.id] });
    },
  });
