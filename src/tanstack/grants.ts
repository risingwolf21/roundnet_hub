import { queryClient } from '@/lib/queryClient';
import { GrantsRepository } from '@/repository/GrantsRepository';
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
    queryFn: () => GrantsRepository.fetchAdminGroups(),
  });
};

export const usePermissions = () => {
  return useQuery({
    queryKey: grantKeys.permissions(),
    queryFn: () => GrantsRepository.fetchPermissions(),
  });
};

export const useFeatures = () => {
  return useQuery({
    queryKey: grantKeys.features(),
    queryFn: () => GrantsRepository.fetchFeatures(),
  });
};

export const useDirectUserGrants = () =>
  useQuery({
    queryKey: grantKeys.user(),
    queryFn: () => GrantsRepository.fetchUsersWithDirectGrants(),
  });

export const useUserPermissions = (userId: string) => {
  return useQuery({
    queryKey: grantKeys.userPermissions(userId),
    queryFn: () => GrantsRepository.fetchUserPermissionGrants(userId),
  });
};

export const useUserFeatures = (userId: string) => {
  return useQuery({
    queryKey: grantKeys.userFeatures(userId),
    queryFn: () => GrantsRepository.fetchUserFeatureGrants(userId),
  });
};

export const useGroupPermissions = (groupId?: string) => {
  return useQuery({
    queryKey: grantKeys.groupPermissions(groupId),
    enabled: !!groupId,
    queryFn: () => GrantsRepository.fetchGroupPermissions(groupId!),
  });
};

export const useGroupFeatures = (groupId?: string) => {
  return useQuery({
    queryKey: grantKeys.groupFeatures(groupId),
    enabled: !!groupId,
    queryFn: () => GrantsRepository.fetchGroupFeatures(groupId!),
  });
};

export const useGrantUserPermissions = () =>
  useMutation({
    mutationFn: async (args: { user: string; perms: string[]; feats: string[] }) => {
      const { user, perms = [], feats = [] } = args;
      return GrantsRepository.grantUserGrants(user, perms, feats);
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
      return GrantsRepository.revokeUserGrants(user, perms, feats);
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
      return GrantsRepository.grantGroupGrants(group, perms, feats);
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
      return GrantsRepository.revokeGroupGrants(group, perms, feats);
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
