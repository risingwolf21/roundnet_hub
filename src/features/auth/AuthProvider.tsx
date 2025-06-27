import { jwtDecode } from "jwt-decode";
import React, { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { UserWithGroups } from "src/types/supabaseTypes";

type AuthContextType = {
  user: UserWithGroups;
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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const jwt = jwtDecode(session.access_token)
        //@ts-ignore
        setPermissions(jwt.user_permissions ?? [])
        //@ts-ignore
        setFeatures(jwt.user_features ?? [])
      }
    };

    fetchUserData();
  }, [user]);

  const isAuthorized = (perm: string) => permissions.includes(perm);
  const hasFeature = (feature: string) => features.includes(feature);

  return (
    <AuthContext.Provider value={{ user, permissions, features, isAuthorized, hasFeature, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};