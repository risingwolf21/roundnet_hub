import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { GroupsRepository } from '@/repository/GroupsRepository';
import { TablesUpdate } from '@/types/supabase-generated.types';
import { FullUserMapping, GroupWithUserMappings } from '@/types/supabaseTypes';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Omit } from 'lodash';

export const fetchGroupUsers = (groupId: string) =>
  supabase
    .from('group_user_mapping')
    .select('*, user: user(*)').eq('group', groupId);


export const groupKeys = {
  all: ['groups'] as const,
  joinRequested: () => [...groupKeys.all, 'joinRequested'] as const,
  single: (groupId?: string) => [...groupKeys.all, groupId] as const,
  users: (groupId?: string) => [...groupKeys.all, groupId, 'users'] as const,
  singleForRole: (groupId: string, role: string) => [...groupKeys.all, groupId, role] as const,
};

export const useRequestedUsersPerGroup = (me: User) =>
  useQuery<GroupUserMapping[]>({
    queryKey: groupKeys.joinRequested(),
    queryFn: async () => {
      const result = await supabase
        .from('group_user_mapping')
        .select('*')
        .eq('role', 'joinRequested')
        .neq('user', me.id);

      return result.data ?? [];
    },
  });

export const useGroups = () =>
  useQuery<GroupWithUserMappings[]>({
    queryKey: groupKeys.all,
    queryFn: GroupsRepository.fetchGroups,
  });

export const useGroup = (groupId?: string) =>
  useQuery<GroupWithUserMappings | null>({
    queryKey: groupKeys.single(groupId),
    enabled: !!groupId,
    queryFn: () => GroupsRepository.fetchSingleGroupWithUsers(groupId),
  });

export const useGroupAllUsers = (groupId?: string) =>
  useQuery<GroupUsers[]>({
    queryKey: groupKeys.users(groupId!),
    enabled: !!groupId,
    queryFn: async () => {
      const result = await fetchGroupUsers(groupId!);

      if (result.error) {
        return [];
      }

      return result.data;
    },
  });

export const useGroupUsers = (role: GroupRole, groupId?: string) =>
  useQuery({
    queryKey: groupKeys.singleForRole(groupId!, role),
    enabled: !!groupId,
    queryFn: async () => {
      const result = await fetchGroupUsers(groupId!)
        .eq('role', role);

      if (result.error) {
        return [];
      }

      return result.data;
    },
  });

export const useJoinGroup = (groupId: string, user: User, role: 'user' | 'admin' | 'joinRequested') =>
  useMutation({
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
      await queryClient.cancelQueries({ queryKey: groupKeys.joinRequested() });

      const prevGroup = queryClient.getQueryData<GroupWithUserMappings | null>(groupKeys.single(groupId));
      const prevGroups = queryClient.getQueryData<GroupWithUserMappings[]>(groupKeys.all);

      if (prevGroup) {
        const newGroup = {
          ...prevGroup,
          users: [
            ...prevGroup.users,
            {
              user: user,
              map: {
                group: groupId,
                role: role,
                user: user.id,
              },
            },
          ],
        };
        queryClient.setQueryData(groupKeys.single(groupId), newGroup);
      }

      if (prevGroups) {
        const newGroups = prevGroups.map((group) =>
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
        );
        queryClient.setQueryData(groupKeys.all, newGroups);
      }

      return { prevGroup, prevGroups };
    },
    onError: (error, _vars, context) => {
      captureException(error, {
        extra: {
          ...error,
        },
        tags: { type: 'JoinGroup', scope: 'groups' },
      });
      queryClient.setQueryData(groupKeys.single(groupId), context?.prevGroup);
      queryClient.setQueryData(groupKeys.all, context?.prevGroups);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.single(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.all });
    },
  });

export const useLeaveGroupMutation = () =>
  useMutation({
    mutationFn: async ({ group, user }: { group: Group; user: User }) => {
      const result = await supabase
        .schema('public')
        .from('group_user_mapping')
        .delete()
        .eq('group', group.id)
        .eq('user', user.id)
        .throwOnError();
      return result.data;
    },
    onMutate: async ({ group }) => {
      await queryClient.cancelQueries({ queryKey: groupKeys.single(group.id) });
      await queryClient.cancelQueries({ queryKey: groupKeys.all });

      const prevGroup = queryClient.getQueryData<GroupWithUserMappings | null>(groupKeys.single(group.id));
      const prevGroups = queryClient.getQueryData<GroupWithUserMappings[]>(groupKeys.all);
      if (prevGroups) {
        const newGroups = prevGroups.filter((x) => x.id !== group.id);
        queryClient.setQueryData(['groups'], newGroups);
      }

      return { prevGroup, prevGroups };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'LeaveGroup', scope: 'groups' },
      });
      queryClient.setQueryData(groupKeys.single(variables.group.id), context?.prevGroup);
      queryClient.setQueryData(groupKeys.all, context?.prevGroups);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.single(vars.group.id) });
      queryClient.invalidateQueries({ queryKey: groupKeys.all });
    },
  });

export const useChangeUserRoleMutation = () =>
  useMutation({
    mutationFn: async ({ group, user, new_role }: { group: Group; user: User; new_role: GroupRole }) => {
      const result = await supabase
        .schema('public')
        .from('group_user_mapping')
        .update({ role: new_role })
        .eq('group', group.id)
        .eq('user', user.id)
        .throwOnError();
      return result.data;
    },
    onMutate: async ({ group, user, new_role }) => {
      await queryClient.cancelQueries({ queryKey: groupKeys.single(group.id) });
      await queryClient.cancelQueries({ queryKey: groupKeys.all });

      const prevGroup = queryClient.getQueryData<GroupWithUserMappings | null>(groupKeys.single(group.id));
      const prevGroups = queryClient.getQueryData<GroupWithUserMappings[]>(groupKeys.all);
      if (prevGroups) {
        const newGroups = prevGroups.map((x) => {
          if (x.id === group.id) {
            return {
              ...x,
              users: x.users.map((y: FullUserMapping) => {
                if (y.user.id === user.id) {
                  return {
                    ...y,
                    map: {
                      group: group.id,
                      role: new_role,
                      user: user.id,
                    },
                  } as FullUserMapping;
                }
                return y;
              }),
            };
          }
          return x;
        });
        queryClient.setQueryData(groupKeys.all, newGroups);
      }

      if (prevGroup) {
        const newGroup = {
          ...prevGroup,
          users: prevGroup.users.map((y: FullUserMapping) => {
            if (y.user.id === user.id) {
              return {
                ...y,
                map: {
                  group: group.id,
                  role: new_role,
                  user: user.id,
                },
              } as FullUserMapping;
            }
            return y;
          }),
        };
        queryClient.setQueryData(groupKeys.single(group.id), newGroup);
      }

      return { prevGroup, prevGroups };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'ChangeUserRole', scope: 'groups' },
      });
      queryClient.setQueryData(groupKeys.single(variables.group.id), context?.prevGroup);
      queryClient.setQueryData(groupKeys.all, context?.prevGroups);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.single(vars.group.id) });
      queryClient.invalidateQueries({ queryKey: groupKeys.all });
    },
  });

export const useCreateGroupMutation = () =>
  useMutation({
    mutationFn: async ({ group, user }: { group: Omit<Group, 'id'>; user: User }) => {
      const result = await supabase
        .rpc('create_group_with_user', {
          group_color: group.color,
          group_description: group.description,
          group_name: group.name,
          is_public: group.is_public,
          need_request: group.need_request_to_join,
          parent: group.parent_group ?? undefined,
          role: 'admin',
          user_id: user.id,
        })
        .throwOnError();

      return result.data!;
    },
    onError: (error, variables) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'CreateGroup', scope: 'groups' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all });
    },
  });

export const useUpdateGroupMutation = (groupId?: string) =>
  useMutation({
    mutationFn: async ({ group }: { group: TablesUpdate<'event_group'> }) => {
      if (!groupId) throw Error('Group Id is missing');
      const result = await supabase
        .schema('public')
        .from('event_group')
        .update(group)
        .eq('id', groupId)
        .select('*')
        .single()
        .throwOnError();

      return result.data!;
    },
    onMutate: async ({ group }) => {
      await queryClient.cancelQueries({ queryKey: groupKeys.single(groupId) });
      await queryClient.cancelQueries({ queryKey: groupKeys.all });

      const prevGroup = queryClient.getQueryData<GroupWithUserMappings | null>(groupKeys.single(groupId));
      const prevGroups = queryClient.getQueryData<GroupWithUserMappings[]>(groupKeys.all);
      if (prevGroup) {
        const newGroup = {
          ...prevGroup,
          ...group,
        };
        queryClient.setQueryData(groupKeys.single(groupId), newGroup);
      }

      if (prevGroups) {
        const newGroups = prevGroups.map((x) =>
          x.id === groupId
            ? {
              ...x,
              ...group,
            }
            : x
        );
        queryClient.setQueryData(['groups'], newGroups);
      }

      return { prevGroup, prevGroups };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'CreateGroup', scope: 'groups' },
      });
      if (groupId) queryClient.setQueryData(groupKeys.single(groupId), context?.prevGroup);
      queryClient.setQueryData(groupKeys.all, context?.prevGroups);
    },
    onSuccess: () => {
      if (groupId) queryClient.invalidateQueries({ queryKey: groupKeys.single(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.all });
    },
  });
