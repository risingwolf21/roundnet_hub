import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from "react";
import { SupabaseUserRepository } from "src/repository/UserRepository";
import { UserWithGroups } from "src/types/supabaseTypes";

type AuthContextType = {
  user: UserWithGroups;
  permissions: string[];
  features: string[];
  isAuthorized: (permission: string) => boolean;
  hasFeature: (feature: string) => boolean;
  signOut: () => void;
  refetchPermissionsAndFeatures: () => void;
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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);

  const fetchUserData = useCallback(async () => {
    const [features, permissions] = await Promise.all([
      SupabaseUserRepository.fetchFeaturesForUser(),
      SupabaseUserRepository.fetchPermissionsForUser()
    ]);

    setPermissions(permissions);
    setFeatures(features);
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData, user]);

  const isAuthorized = (perm: string) => permissions.includes(perm);
  const hasFeature = (feature: string) => features.includes(feature);

  return (
    <AuthContext.Provider value={{ user, permissions, features, isAuthorized, hasFeature, signOut, refetchPermissionsAndFeatures: fetchUserData }}>
      {children}
    </AuthContext.Provider>
  );
};