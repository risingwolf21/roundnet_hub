import { queryClient } from '@/lib/queryClient';
import { NewTrialInvite, TrialRepository } from '@/repository/TrialRepository';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authKeys } from './auth';
import { eventKeys } from './events';
import { groupKeys } from './groups';

export const trialKeys = {
  all: ['trials'] as const,
  inviteInfo: (token: string) => [...trialKeys.all, 'invite', token] as const,
  invites: (groupId: string) => [...trialKeys.all, 'invites', groupId] as const,
  groupAllowsGuests: (groupId: string) => [...trialKeys.all, 'allowsGuests', groupId] as const,
  status: (groupId: string, userId?: string) => [...trialKeys.all, 'status', groupId, userId ?? 'me'] as const,
};

export const useTrialInviteInfo = (token: string) =>
  useQuery({
    queryKey: trialKeys.inviteInfo(token),
    queryFn: () => TrialRepository.fetchInviteInfo(token),
    staleTime: 0,
  });

/** Trial limit and usage of the signed-in person, or (for group admins) of a member. */
export const useTrialStatus = (groupId: string, userId?: string, enabled = true) =>
  useQuery({
    queryKey: trialKeys.status(groupId, userId),
    queryFn: () => TrialRepository.fetchStatus(groupId, userId),
    enabled,
  });

export const useRedeemTrialInvite = () =>
  useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: ({ token, name }: { token: string; name?: string }) => TrialRepository.redeemInvite(token, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      queryClient.invalidateQueries({ queryKey: groupKeys.all });
      queryClient.invalidateQueries({ queryKey: trialKeys.all });
    },
  });

export const useGroupAllowsGuests = (groupId: string) =>
  useQuery({
    queryKey: trialKeys.groupAllowsGuests(groupId),
    queryFn: () => TrialRepository.fetchGroupAllowsGuests(groupId),
  });

export const useTrialInvites = (groupId: string) =>
  useQuery({
    queryKey: trialKeys.invites(groupId),
    queryFn: () => TrialRepository.fetchInvites(groupId),
  });

export const useCreateTrialInvite = () =>
  useMutation({
    mutationFn: (invite: NewTrialInvite) => TrialRepository.createInvite(invite),
    onSuccess: (_data, invite) => queryClient.invalidateQueries({ queryKey: trialKeys.invites(invite.group) }),
  });

export const useDeactivateTrialInvite = (groupId: string) =>
  useMutation({
    mutationFn: (id: string) => TrialRepository.deactivateInvite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trialKeys.invites(groupId) }),
  });

export const useSetTrialEventLimit = (groupId: string) =>
  useMutation({
    mutationFn: ({ userId, limit }: { userId: string; limit: number | null }) => TrialRepository.setEventLimit(groupId, userId, limit),
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: trialKeys.status(groupId, userId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.single(groupId) });
    },
  });

export const useSignInAsGuest = () =>
  useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: ({ name, language }: { name: string; language: string }) => TrialRepository.signInAsGuest(name, language),
  });

export const useLinkGuestEmail = () =>
  useMutation({
    meta: { suppressErrorToast: true },
    mutationFn: (email: string) => TrialRepository.linkEmail(email),
  });
