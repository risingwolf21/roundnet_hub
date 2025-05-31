import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "src/App";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { GroupsRepository } from "src/repository/GroupsRepository";
import { GroupWithUserMappings } from "src/types/supabaseTypes";


export const useRequestedUsersPerGroup = () => useQuery<GroupUserMapping[]>({
  queryKey: ['groups', 'joinRequested'],
  queryFn: async () => {
    const result = await supabase
      .from("group_user_mapping")
      .select("*")
      .eq("role", "joinRequested");

    return result.data ?? [];
  }
})

export const useGroups = () => useQuery<GroupWithUserMappings[]>({
  queryKey: ['groups'],
  queryFn: GroupsRepository.fetchGroups
})

export const useGroup = (groupId?: string) => useQuery<GroupWithUserMappings | null>({
  queryKey: ['group', groupId],
  enabled: !!groupId,
  queryFn: () => GroupsRepository.fetchSingleGroupWithUsers(groupId),
});

export const useJoinGroup = (groupId: string, user: User, role: "user" | "admin" | "joinRequested") => useMutation({
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

    const prevGroup = queryClient.getQueryData<GroupWithUserMappings | null>(['group', groupId])
    const prevGroups = queryClient.getQueryData<GroupWithUserMappings[]>(['groups'])

    if (prevGroup) {
      const newGroup = {
        ...prevGroup,
        users: [...prevGroup.users, {
          user: user,
          map: {
            group: groupId,
            role: role,
            user: user.userId
          }
        }],
      }
      queryClient.setQueryData(['group', groupId], newGroup)
    }

    if (prevGroups) {
      const newGroups = prevGroups.map(group =>
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
      queryClient.setQueryData(['groups'], newGroups);
    }


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