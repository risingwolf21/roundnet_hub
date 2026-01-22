import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';

export const grantKeys = {
  all: ['grants'] as const,
  groups: () => [...grantKeys.all, 'groups'] as const,
  permissions: () => [...grantKeys.all, 'permissions'] as const,
  features: () => [...grantKeys.all, 'features'] as const,
  user: () => [...grantKeys.all, 'user'] as const,
  userPermissions: (userId: string) => [...grantKeys.all, 'user-permissions', userId] as const,
  userFeatures: (userId: string) => [...grantKeys.all, 'user-features', userId] as const,
  groupPermissions: (groupId?: string) => [...grantKeys.all, 'group-permissions', groupId] as const,
  groupFeatures: (groupId?: string) => [...grantKeys.all, 'group-features', groupId] as const,
};

export const useGroups = () => {
  return useQuery({
    queryKey: grantKeys.groups(),
    queryFn: async () => {
      const result = await supabase.from('event_groups_view').select('*').eq('role', 'admin');

      return result?.data ?? [];
    },
  });
};

export const usePermissions = () => {
  return useQuery({
    queryKey: grantKeys.permissions(),
    queryFn: async () => {
      const { data, error } = await supabase.from('permissions').select('name').order('name');
      if (error) throw error;
      return data?.map((x) => x.name) ?? [];
    },
  });
};

export const useFeatures = () => {
  return useQuery({
    queryKey: grantKeys.features(),
    queryFn: async () => {
      const { data, error } = await supabase.from('features').select('name').order('name');
      if (error) throw error;
      return data?.map((x) => x.name) ?? [];
    },
  });
};

export const useDirectUserGrants = () =>
  useQuery({
    queryKey: grantKeys.user(),
    queryFn: async () => {
      const result = await supabase.from('user_direct_grants').select('user:user(*)').throwOnError();

      const users = new Map<string, User>();

      result.data?.forEach((x) => !users.has(x.user.id) && users.set(x.user.id, x.user));

      return [...users.values()];
    },
  });

export const useUserPermissions = (userId: string) => {
  return useQuery({
    queryKey: grantKeys.userPermissions(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_direct_grants')
        .select('*')
        .eq('kind', 'perm')
        .eq('user', userId);
      if (error) throw error;
      return data?.map((x) => x.key) ?? [];
    },
  });
};

export const useUserFeatures = (userId: string) => {
  return useQuery({
    queryKey: grantKeys.userFeatures(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_direct_grants')
        .select('*')
        .eq('kind', 'feat')
        .eq('user', userId);
      if (error) throw error;
      return data?.map((x) => x.key) ?? [];
    },
  });
};

export const useGroupPermissions = (groupId?: string) => {
  return useQuery({
    queryKey: grantKeys.groupPermissions(groupId),
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_permissions')
        .select('group, permission')
        .eq('group', groupId as string);
      if (error) throw error;
      return data?.map((x) => x.permission) ?? [];
    },
  });
};

export const useGroupFeatures = (groupId?: string) => {
  return useQuery({
    queryKey: grantKeys.groupFeatures(groupId),
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_features')
        .select('group, feature')
        .eq('group', groupId as string);
      if (error && (error as any).code === '42P01') return [];
      if (error) throw error;
      return data?.map((x) => x.feature) ?? [];
    },
  });
};

export const useGrantUserPermissions = () =>
  useMutation({
    mutationFn: async (args: { user: string; perms: string[]; feats: string[] }) => {
      const { user, perms = [], feats = [] } = args;
      const result = await supabase
        .rpc('grant_user_grants', { p_user: user, p_perms: perms, p_feats: feats })
        .throwOnError();

      return result.data;
    },
    onMutate: async (args: { user: string; perms: string[]; feats: string[] }) => {
      await queryClient.cancelQueries({ queryKey: grantKeys.all });

      const previousGroupPermissions = queryClient.getQueryData<string[]>(grantKeys.userPermissions(args.user));
      const previousGroupFeatures = queryClient.getQueryData<string[]>(grantKeys.userFeatures(args.user));

      if (previousGroupPermissions) {
        const newGroupPermissions = [...previousGroupPermissions, ...args.perms];
        queryClient.setQueryData(grantKeys.userPermissions(args.user), newGroupPermissions);
      }

      if (previousGroupFeatures) {
        const newGroupFeatures = [...previousGroupFeatures, ...args.feats];
        queryClient.setQueryData(grantKeys.userFeatures(args.user), newGroupFeatures);
      }

      return { previousGroupPermissions, previousGroupFeatures };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'GrantUserPermissions', scope: 'grants' },
      });
      if (context?.previousGroupFeatures) {
        queryClient.setQueryData(grantKeys.userPermissions(variables.user), context.previousGroupFeatures);
      }
      if (context?.previousGroupPermissions) {
        queryClient.setQueryData(grantKeys.userFeatures(variables.user), context.previousGroupPermissions);
      }
    },
    onSettled: (_d, _e, _v) => {
      queryClient.invalidateQueries({ queryKey: grantKeys.user() });
      queryClient.invalidateQueries({ queryKey: grantKeys.userPermissions(_v.user) });
      queryClient.invalidateQueries({ queryKey: grantKeys.userFeatures(_v.user) });
    },
  });

export const useRevokeUserPermissions = () =>
  useMutation({
    mutationFn: async (args: { user: string; perms: string[]; feats: string[] }) => {
      const { user, perms = [], feats = [] } = args;
      const result = await supabase
        .rpc('revoke_user_grants', { p_user: user, p_perms: perms, p_feats: feats })
        .throwOnError();

      return result.data;
    },
    onMutate: async (args: { user: string; perms: string[]; feats: string[] }) => {
      await queryClient.cancelQueries({ queryKey: grantKeys.all });

      const previousGroupPermissions = queryClient.getQueryData<string[]>(grantKeys.userPermissions(args.user));
      const previousGroupFeatures = queryClient.getQueryData<string[]>(grantKeys.userFeatures(args.user));

      if (previousGroupPermissions) {
        const newGroupPermissions = previousGroupPermissions.filter((x) => !args.perms.includes(x));
        queryClient.setQueryData(grantKeys.userPermissions(args.user), newGroupPermissions);
      }

      if (previousGroupFeatures) {
        const newGroupFeatures = previousGroupFeatures.filter((x) => !args.feats.includes(x));
        queryClient.setQueryData(grantKeys.userFeatures(args.user), newGroupFeatures);
      }

      return { previousGroupPermissions, previousGroupFeatures };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'RevokeUserPermissions', scope: 'grants' },
      });
      if (context?.previousGroupFeatures) {
        queryClient.setQueryData(grantKeys.userPermissions(variables.user), context.previousGroupFeatures);
      }
      if (context?.previousGroupPermissions) {
        queryClient.setQueryData(grantKeys.userFeatures(variables.user), context.previousGroupPermissions);
      }
    },
    onSettled: (_d, _e, _v) => {
      queryClient.invalidateQueries({ queryKey: grantKeys.user() });
      queryClient.invalidateQueries({ queryKey: grantKeys.userPermissions(_v.user) });
      queryClient.invalidateQueries({ queryKey: grantKeys.userFeatures(_v.user) });
    },
  });

export const useGrantGroupPermissions = () =>
  useMutation({
    mutationFn: async (args: { group: string; perms: string[]; feats: string[] }) => {
      const { group, perms = [], feats = [] } = args;
      const result = await supabase
        .rpc('grant_group_grants', { p_group: group, p_perms: perms, p_feats: feats })
        .throwOnError();

      return result.data;
    },
    onMutate: async (args: { group: string; perms: string[]; feats: string[] }) => {
      await queryClient.cancelQueries({ queryKey: grantKeys.all });

      const previousGroupPermissions = queryClient.getQueryData<string[]>(grantKeys.groupPermissions(args.group));
      const previousGroupFeatures = queryClient.getQueryData<string[]>(grantKeys.groupFeatures(args.group));

      if (previousGroupPermissions) {
        const newGroupPermissions = [...previousGroupPermissions, ...args.perms];
        queryClient.setQueryData(grantKeys.groupPermissions(args.group), newGroupPermissions);
      }

      if (previousGroupFeatures) {
        const newGroupFeatures = [...previousGroupFeatures, ...args.feats];
        queryClient.setQueryData(grantKeys.groupFeatures(args.group), newGroupFeatures);
      }

      return { previousGroupPermissions, previousGroupFeatures };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'GrantGroupPermissions', scope: 'grants' },
      });
      if (context?.previousGroupFeatures) {
        queryClient.setQueryData(grantKeys.groupPermissions(variables.group), context.previousGroupFeatures);
      }
      if (context?.previousGroupPermissions) {
        queryClient.setQueryData(grantKeys.groupFeatures(variables.group), context.previousGroupPermissions);
      }
    },
    onSettled: (_d, _e, _v) => {
      queryClient.invalidateQueries({ queryKey: grantKeys.groupPermissions(_v.group) });
      queryClient.invalidateQueries({ queryKey: grantKeys.groupFeatures(_v.group) });
    },
  });

export const useRevokeGroupPermissions = () =>
  useMutation({
    mutationFn: async (args: { group: string; perms: string[]; feats: string[] }) => {
      const { group, perms = [], feats = [] } = args;
      const result = await supabase
        .rpc('revoke_group_grants', { p_group: group, p_perms: perms, p_feats: feats })
        .throwOnError();

      return result.data;
    },
    onMutate: async (args: { group: string; perms: string[]; feats: string[] }) => {
      await queryClient.cancelQueries({ queryKey: grantKeys.all });

      const previousGroupPermissions = queryClient.getQueryData<string[]>(grantKeys.groupPermissions(args.group));
      const previousGroupFeatures = queryClient.getQueryData<string[]>(grantKeys.groupFeatures(args.group));

      if (previousGroupPermissions) {
        const newGroupPermissions = previousGroupPermissions.filter((x) => !args.perms.includes(x));
        queryClient.setQueryData(grantKeys.groupPermissions(args.group), newGroupPermissions);
      }

      if (previousGroupFeatures) {
        const newGroupFeatures = previousGroupFeatures.filter((x) => !args.feats.includes(x));
        queryClient.setQueryData(grantKeys.groupFeatures(args.group), newGroupFeatures);
      }

      return { previousGroupPermissions, previousGroupFeatures };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          ...variables,
          ...error,
        },
        tags: { type: 'RevokeGroupPermissions', scope: 'grants' },
      });
      if (context?.previousGroupFeatures) {
        queryClient.setQueryData(grantKeys.groupPermissions(variables.group), context.previousGroupFeatures);
      }
      if (context?.previousGroupPermissions) {
        queryClient.setQueryData(grantKeys.groupFeatures(variables.group), context.previousGroupPermissions);
      }
    },
    onSettled: (_d, _e, _v) => {
      queryClient.invalidateQueries({ queryKey: grantKeys.groupPermissions(_v.group) });
      queryClient.invalidateQueries({ queryKey: grantKeys.groupFeatures(_v.group) });
    },
  });
