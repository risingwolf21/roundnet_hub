import { supabase } from '@/lib/supabase';
import { SupabaseUserRepository } from '@/repository/UserRepository';
import { UserWithGroups } from '@/types/supabaseTypes';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';


type AuthContextType = {
  user: UserWithGroups;
  permissions: string[];
  features: string[];
  signOut: () => void;
};
// export the useAuth hook
export const useAuthentication = () => {
  return useContext(AuthContext);
};

export const AuthContext = createContext<AuthContextType>(null!);

type AuthProviderProps = PropsWithChildren & {
  user: UserWithGroups;
  signOut: () => void;
};

export const AuthProvider = ({ children, user, signOut }: AuthProviderProps) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);

  const fetchUserData = useCallback(async () => {
    const grants = await SupabaseUserRepository.fetchGrantsForUser(user.userId);

    setPermissions(grants.filter(x => x.kind === 'perm').map(x => x.key));
    setFeatures(grants.filter(x => x.kind === 'feat').map(x => x.key));
  }, []);

  useEffect(() => {
    fetchUserData();

    const subscription = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_user_mapping',
          filter: `user=eq.${user.userId}`,
        },
        (payload) => {
          fetchUserData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserData, user]);

  return <AuthContext.Provider value={{ user, permissions, features, signOut }}>{children}</AuthContext.Provider>;
};
