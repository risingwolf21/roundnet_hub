import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { GroupsRepository } from '@/repository/GroupsRepository';
import { TablesUpdate } from '@/types/supabase-generated.types';
import { FullUserMapping, GroupWithUserMappings } from '@/types/supabaseTypes';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Omit } from 'lodash';

export const useRequestedUsersPerGroup = (me: User) =>
  useQuery<GroupUserMapping[]>({
    queryKey: ['groups', 'joinRequested'],
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
    queryKey: ['groups'],
    queryFn: GroupsRepository.fetchGroups,
  });

export const useGroup = (groupId?: string) =>
  useQuery<GroupWithUserMappings | null>({
    queryKey: ['group', groupId],
    enabled: !!groupId,
    queryFn: () => GroupsRepository.fetchSingleGroupWithUsers(groupId),
  });

export const useGroupUsers = (role: GroupRole, groupId?: string) =>
  useQuery({
    queryKey: ['group', groupId, role],
    enabled: !!groupId,
    queryFn: async () => {
      const result = await supabase
        .from('group_user_mapping')
        .select('*, user: user(*)')
        .eq('group', groupId!)
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
      await queryClient.cancelQueries({ queryKey: ['group', groupId] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });
      await queryClient.cancelQueries({ queryKey: ['groups', 'joinRequested'] });

      const prevGroup = queryClient.getQueryData<GroupWithUserMappings | null>(['group', groupId]);
      const prevGroups = queryClient.getQueryData<GroupWithUserMappings[]>(['groups']);

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
        queryClient.setQueryData(['group', groupId], newGroup);
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
        queryClient.setQueryData(['groups'], newGroups);
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
      queryClient.setQueryData(['group', groupId], context?.prevGroup);
      queryClient.setQueryData(['groups'], context?.prevGroups);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
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
      await queryClient.cancelQueries({ queryKey: ['group', group.id] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      const prevGroup = queryClient.getQueryData<GroupWithUserMappings | null>(['group', group.id]);
      const prevGroups = queryClient.getQueryData<GroupWithUserMappings[]>(['groups']);

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
      queryClient.setQueryData(['group', variables.group.id], context?.prevGroup);
      queryClient.setQueryData(['groups'], context?.prevGroups);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['group', vars.group.id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
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
      await queryClient.cancelQueries({ queryKey: ['group', group.id] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      const prevGroup = queryClient.getQueryData<GroupWithUserMappings | null>(['group', group.id]);
      const prevGroups = queryClient.getQueryData<GroupWithUserMappings[]>(['groups']);

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
        queryClient.setQueryData(['groups'], newGroups);
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
        queryClient.setQueryData(['group', group.id], newGroup);
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
      queryClient.setQueryData(['group', variables.group.id], context?.prevGroup);
      queryClient.setQueryData(['groups'], context?.prevGroups);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['group', vars.group.id] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
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
      queryClient.invalidateQueries({ queryKey: ['groups'] });
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
      await queryClient.cancelQueries({ queryKey: ['group', groupId] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      const prevGroup = queryClient.getQueryData<GroupWithUserMappings | null>(['group', groupId]);
      const prevGroups = queryClient.getQueryData<GroupWithUserMappings[]>(['groups']);

      if (prevGroup) {
        const newGroup = {
          ...prevGroup,
          ...group,
        };
        queryClient.setQueryData(['group', groupId], newGroup);
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
      if (groupId) queryClient.setQueryData(['group', groupId], context?.prevGroup);
      queryClient.setQueryData(['groups'], context?.prevGroups);
    },
    onSuccess: () => {
      if (groupId) queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
