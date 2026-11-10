// Own file so events.ts (attendance) and trials.ts can both use the keys without importing each other.
export const trialKeys = {
  all: ['trials'] as const,
  inviteInfo: (token: string) => [...trialKeys.all, 'invite', token] as const,
  invites: (groupId: string) => [...trialKeys.all, 'invites', groupId] as const,
  groupAllowsGuests: (groupId: string) => [...trialKeys.all, 'allowsGuests', groupId] as const,
  status: (groupId: string, userId?: string) => [...trialKeys.all, 'status', groupId, userId ?? 'me'] as const,
};
