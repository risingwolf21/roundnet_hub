import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { SupabaseUserRepository } from "src/repository/UserRepository";
import { UserWithGroups } from "src/types/supabaseTypes";

export type Permission =
  'events:view'
  | 'events:edit'
  | 'events:delete'
  | 'events:insert'
  | 'events:comments:insert'
  | 'events:constellations'
  | 'drinks:order'
  | 'groups:create:admin'
  | 'event:attendance:admin'
  | 'event:attendance:trainer'
  | 'drinks:history:add'
  | 'drinks:history:select'
  | 'drinks:payments:select'
  | 'payments:admin'
  | 'drink:admin'
  | 'user:admin'
  | 'history:admin'
  | 'group:admin'
  | 'permissions:admin'
  | 'feature:admin'
  | 'supabase:admin'
  | 'challenge:points:insert'
  | 'items:update'

type AuthContextType = {
  user: UserWithGroups;
  roles: string[];
  permissions: string[];
  features: string[];
  isAuthorized: (permission: string) => boolean;
  hasFeature: (feature: string) => boolean;
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
}

export const AuthProvider = ({ children, user, signOut }: AuthProviderProps) => {
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      const [roles, features, permissions] = await Promise.all([
        SupabaseUserRepository.fetchRolesForUser(user.userId),
        SupabaseUserRepository.fetchFeaturesForUser(),
        SupabaseUserRepository.fetchPermissionsForUser()
      ]);

      setPermissions(permissions);
      setFeatures(features);
      setRoles(roles.map(x => x.name))
    };

    fetchUserData();
  }, [user]);

  const isAuthorized = (perm: string) => permissions.includes(perm);
  const hasFeature = (feature: string) => features.includes(feature);

  return (
    <AuthContext.Provider value={{ user, roles, permissions, features, isAuthorized, hasFeature, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};