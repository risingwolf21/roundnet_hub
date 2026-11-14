import { supabase } from '@/lib/supabase';
import { GrantsRepository } from '@/repository/GrantsRepository';
import { UserRepository } from '@/repository/UserRepository';
import { UserWithGroups } from '@/types/supabaseTypes';
import { captureException, setUser } from '@sentry/react';
import { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import _ from 'lodash';

export const authKeys = {
  all: ['auth'] as const,
  currentUser: (userId?: string) => [...authKeys.all, 'current-user', userId] as const,
  currentUserGrants: (userId: string | undefined | null) => [...authKeys.all, 'current-user', userId, 'grants'] as const,
};

export const useCurrentUser = (session: Session | null) =>
  useQuery({
    queryKey: authKeys.currentUser(session?.user.id),
    enabled: !!session?.user.id,
    staleTime: Infinity,
    queryFn: async () => {
      if (!session) return null;
      setUser({ email: session.user.email, id: session.user.id, ...(_.omit(session.user, ['id', 'email'])) });
      const [{ data: user, error }, groups] = await Promise.all([
        UserRepository.fetchUser(session.user.id),
        UserRepository.fetchGroupsForUser(session.user.id),
      ]);
      if (error) {
        captureException(error);
        throw error;
      }

      const userData: UserWithGroups = {
        ...user,
        groups,
      };
      return userData;
    },
  });

export const useCurrentUserGrants = (userId?: string | null) =>
  useQuery({
    queryKey: authKeys.currentUserGrants(userId),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { perm: [], feat: [] };
      // After a sign-out the query can still refetch for the old user; without a session the
      // request runs as anon, which may not read group memberships.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id !== userId) return { perm: [], feat: [] };

      const data = await GrantsRepository.fetchUserGrants(userId);

      return (data ?? []).reduce(
        (prev, curr) => {
          if (curr.key && curr.kind) {
            switch (curr.kind) {
              case 'perm':
                prev.perm.push(curr.key);
                break;
              case 'feat':
                prev.feat.push(curr.key);
                break;
            }
          }
          return prev;
        },
        { perm: [] as string[], feat: [] as string[] }
      );
    },
    refetchOnWindowFocus: false,
  });
