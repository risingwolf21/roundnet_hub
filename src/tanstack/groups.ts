import { useMutation, useQuery } from "@tanstack/react-query";
import { Omit } from "lodash";
import { queryClient } from "src/App";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { GroupsRepository } from "src/repository/GroupsRepository";
import { TablesUpdate } from "src/types/supabase-generated.types";
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

export const useCreateGroupMutation = () => useMutation({
  mutationFn: async ({ group, user }: { group: Omit<Group, "id">, user: User }) => {
    const result = await supabase.rpc("create_group_with_user", {
      group_color: group.color,
      group_description: group.description,
      group_name: group.name,
      is_public: group.is_public,
      need_request: group.need_request_to_join,
      parent: group.parent_group ?? undefined,
      role: "admin",
      user_id: user.userId
    })
      .throwOnError();

    return result.data!;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["groups"] });
  }
})

export const useUpdateGroupMutation = (groupId?: string) => useMutation({
  mutationFn: async ({ group }: { group: TablesUpdate<"event_group"> }) => {
    if (!groupId)
      throw Error("Group Id is missing")
    const result = await supabase
      .schema("public")
      .from("event_group")
      .update(group)
      .eq("id", groupId)
      .select("*")
      .single()
      .throwOnError();

    return result.data!;
  },
  onMutate: async ({ group }) => {
    await queryClient.cancelQueries({ queryKey: ['group', groupId] })
    await queryClient.cancelQueries({ queryKey: ['groups'] })

    const prevGroup = queryClient.getQueryData<GroupWithUserMappings | null>(['group', groupId])
    const prevGroups = queryClient.getQueryData<GroupWithUserMappings[]>(['groups'])

    if (prevGroup) {
      const newGroup = {
        ...prevGroup,
        ...group
      }
      queryClient.setQueryData(['group', groupId], newGroup)
    }

    if (prevGroups) {
      const newGroups = prevGroups.map(x =>
        x.id === groupId
          ? {
            ...x,
            ...group
          }
          : x
      )
      queryClient.setQueryData(['groups'], newGroups);
    }

    return { prevGroup, prevGroups }
  },
  onError: (_err, _vars, context) => {
    if (groupId)
      queryClient.setQueryData(['group', groupId], context?.prevGroup)
    queryClient.setQueryData(['groups'], context?.prevGroups)
  },
  onSuccess: () => {
    if (groupId)
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
    queryClient.invalidateQueries({ queryKey: ['groups'] })
  },
})