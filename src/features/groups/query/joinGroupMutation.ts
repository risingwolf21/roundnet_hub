import { useMutation } from "@tanstack/react-query";
import { queryClient } from 'src/lib/queryClient';
import { GroupsRepository } from "src/repository/GroupsRepository";
import { GroupWithUserMappings } from "src/types/supabaseTypes";

export const useJoinGroup = (groupId: string, user: User, role: "user" | "admin" | "joinRequested") => {
  return useMutation({
    mutationFn: async () => {
      const result = await GroupsRepository
        .addUserToGroup(groupId, user.userId, role)

      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['group', groupId] })
      await queryClient.cancelQueries({ queryKey: ['groups'] })

      const prevGroup = queryClient.getQueryData(['group', groupId])
      const prevGroups = queryClient.getQueryData(['groups'])

      queryClient.setQueryData(['group', groupId], (old: GroupWithUserMappings) => ({
        ...old,
        users: [...old.users, {
          user: user,
          map: {
            group: groupId,
            role: role,
            user: user.userId
          }
        }],
      }))

      queryClient.setQueryData(['groups'], (old: GroupWithUserMappings[]) =>
        old.map(group =>
          group.id === groupId
            ? {
              ...group, users: [...group.users, {
                user: user,
                map: {
                  group: groupId,
                  role: role,
                  user: user.userId
                }
              }]
            }
            : group
        )
      )

      return { prevGroup, prevGroups }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['group', groupId], context?.prevGroup)
      queryClient.setQueryData(['groups'], context?.prevGroups)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}