import { supabase } from "@/lib/supabase";
import { SupabaseUserRepository } from "@/repository/UserRepository";
import { UserWithGroups } from "@/types/supabaseTypes";
import { captureException, setUser } from "@sentry/react";
import { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";

export const authKeys = {
  all: ['auth'] as const,
  currentUser: (userId?: string) => [...authKeys.all, 'current-user', userId] as const,
  currentUserGrants: (userId: string) => [...authKeys.all, 'current-user', userId, 'grants'] as const,
}

export const useCurrentUser = (session: Session | null) => useQuery({
  queryKey: authKeys.currentUser(session?.user.id),
  enabled: !!session,
  queryFn: async () => {
    if (!session) return null;
    const [{ data: user, error }, groups] = await Promise.all([
      SupabaseUserRepository.fetchUser(session.user.id),
      SupabaseUserRepository.fetchGroupsForUser(session.user.id),
    ]);
    if (error) {
      captureException(error);
      return null;
    }

    const userData: UserWithGroups = {
      ...user,
      groups,
    };
    setUser({ email: userData.email, id: userData.id, username: userData.name });
    return userData;
  },
});

export const useCurrentUserGrants = (userId: string) => useQuery({
  queryKey: authKeys.currentUserGrants(userId),
  enabled: true,
  queryFn: async () => {
    const { data, error } = await supabase.from('user_grants_view').select('kind,key').eq('user', userId);

    if (error) throw error;

    return data.reduce(
      (prev, curr) => {
        if (curr.key && curr.kind) {
          switch (curr.kind) {
            case 'perm':
              return { feat: prev.feat, perm: prev.perm.add(curr.key) };
            case 'feat':
              return { feat: prev.feat.add(curr.key), perm: prev.perm };
          }
        }
        return prev;
      },
      { perm: new Set<string>(), feat: new Set<string>() }
    );
  },
  refetchOnWindowFocus: false,
});