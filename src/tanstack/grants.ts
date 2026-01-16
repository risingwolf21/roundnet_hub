import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';

export const useGroups = () => {
  return useQuery({
    queryKey: ['grants', 'groups'],
    queryFn: async () => {
      const result = await supabase.from('event_groups_view').select('*').eq('role', 'admin');

      return result?.data ?? [];
    },
  });
};

export const usePermissions = () => {
  return useQuery({
    queryKey: ['grants', 'permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('permissions').select('name').order('name');
      if (error) throw error;
      return data?.map((x) => x.name) ?? [];
    },
  });
};

export const useFeatures = () => {
  return useQuery({
    queryKey: ['grants', 'features'],
    queryFn: async () => {
      const { data, error } = await supabase.from('features').select('name').order('name');
      if (error) throw error;
      return data?.map((x) => x.name) ?? [];
    },
  });
};

export const useDirectUserGrants = () =>
  useQuery({
    queryKey: ['grants', 'user'],
    queryFn: async () => {
      const result = await supabase.from('user_direct_grants').select('user:user(*)').throwOnError();

      const users = new Map<string, User>();

      result.data?.forEach((x) => !users.has(x.user.id) && users.set(x.user.id, x.user));

      return [...users.values()];
    },
  });

export const useUserPermissions = (userId: string) => {
  return useQuery({
    queryKey: ['grants', 'user-permissions', userId],
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
    queryKey: ['grants', 'user-features', userId],
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
    queryKey: ['grants', 'group-permissions', groupId],
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
    queryKey: ['grants', 'group-features', groupId],
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
      await queryClient.cancelQueries({ queryKey: ['matches'] });

      const previousGroupPermissions = queryClient.getQueryData<string[]>(['grants', 'user-permissions', args.user]);
      const previousGroupFeatures = queryClient.getQueryData<string[]>(['grants', 'user-features', args.user]);

      if (previousGroupPermissions) {
        const newGroupPermissions = [...previousGroupPermissions, ...args.perms];
        queryClient.setQueryData(['grants', 'user-permissions', args.user], newGroupPermissions);
      }

      if (previousGroupFeatures) {
        const newGroupFeatures = [...previousGroupFeatures, ...args.feats];
        queryClient.setQueryData(['grants', 'user-features', args.user], newGroupFeatures);
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
        queryClient.setQueryData(['grants', 'user-permissions', variables.user], context.previousGroupFeatures);
      }
      if (context?.previousGroupPermissions) {
        queryClient.setQueryData(['grants', 'user-features', variables.user], context.previousGroupPermissions);
      }
    },
    onSettled: (_d, _e, _v) => {
      queryClient.invalidateQueries({ queryKey: ['grants', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['grants', 'user-permissions', _v.user] });
      queryClient.invalidateQueries({ queryKey: ['grants', 'user-features', _v.user] });
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
      await queryClient.cancelQueries({ queryKey: ['matches'] });

      const previousGroupPermissions = queryClient.getQueryData<string[]>(['grants', 'user-permissions', args.user]);
      const previousGroupFeatures = queryClient.getQueryData<string[]>(['grants', 'user-features', args.user]);

      if (previousGroupPermissions) {
        const newGroupPermissions = previousGroupPermissions.filter((x) => !args.perms.includes(x));
        queryClient.setQueryData(['grants', 'user-permissions', args.user], newGroupPermissions);
      }

      if (previousGroupFeatures) {
        const newGroupFeatures = previousGroupFeatures.filter((x) => !args.feats.includes(x));
        queryClient.setQueryData(['grants', 'user-features', args.user], newGroupFeatures);
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
        queryClient.setQueryData(['grants', 'user-permissions', variables.user], context.previousGroupFeatures);
      }
      if (context?.previousGroupPermissions) {
        queryClient.setQueryData(['grants', 'user-features', variables.user], context.previousGroupPermissions);
      }
    },
    onSettled: (_d, _e, _v) => {
      queryClient.invalidateQueries({ queryKey: ['grants', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['grants', 'user-permissions', _v.user] });
      queryClient.invalidateQueries({ queryKey: ['grants', 'user-features', _v.user] });
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
      await queryClient.cancelQueries({ queryKey: ['matches'] });

      const previousGroupPermissions = queryClient.getQueryData<string[]>(['grants', 'group-permissions', args.group]);
      const previousGroupFeatures = queryClient.getQueryData<string[]>(['grants', 'group-features', args.group]);

      if (previousGroupPermissions) {
        const newGroupPermissions = [...previousGroupPermissions, ...args.perms];
        queryClient.setQueryData(['grants', 'group-permissions', args.group], newGroupPermissions);
      }

      if (previousGroupFeatures) {
        const newGroupFeatures = [...previousGroupFeatures, ...args.feats];
        queryClient.setQueryData(['grants', 'group-features', args.group], newGroupFeatures);
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
        queryClient.setQueryData(['grants', 'group-permissions', variables.group], context.previousGroupFeatures);
      }
      if (context?.previousGroupPermissions) {
        queryClient.setQueryData(['grants', 'group-features', variables.group], context.previousGroupPermissions);
      }
    },
    onSettled: (_d, _e, _v) => {
      queryClient.invalidateQueries({ queryKey: ['grants', 'group-permissions', _v.group] });
      queryClient.invalidateQueries({ queryKey: ['grants', 'group-features', _v.group] });
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
      await queryClient.cancelQueries({ queryKey: ['matches'] });

      const previousGroupPermissions = queryClient.getQueryData<string[]>(['grants', 'group-permissions', args.group]);
      const previousGroupFeatures = queryClient.getQueryData<string[]>(['grants', 'group-features', args.group]);

      if (previousGroupPermissions) {
        const newGroupPermissions = previousGroupPermissions.filter((x) => !args.perms.includes(x));
        queryClient.setQueryData(['grants', 'group-permissions', args.group], newGroupPermissions);
      }

      if (previousGroupFeatures) {
        const newGroupFeatures = previousGroupFeatures.filter((x) => !args.feats.includes(x));
        queryClient.setQueryData(['grants', 'group-features', args.group], newGroupFeatures);
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
        queryClient.setQueryData(['grants', 'group-permissions', variables.group], context.previousGroupFeatures);
      }
      if (context?.previousGroupPermissions) {
        queryClient.setQueryData(['grants', 'group-features', variables.group], context.previousGroupPermissions);
      }
    },
    onSettled: (_d, _e, _v) => {
      queryClient.invalidateQueries({ queryKey: ['grants', 'group-permissions', _v.group] });
      queryClient.invalidateQueries({ queryKey: ['grants', 'group-features', _v.group] });
    },
  });
