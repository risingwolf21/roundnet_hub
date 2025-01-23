import { createContext, useContext } from 'react';
import { UserWithRolesAndPermissions } from '../../types/supabaseTypes';

export const AuthContext = createContext<{
  user: UserWithRolesAndPermissions;
  deviceId: string;
  signOut: () => void;
}>(null!);

// export the useAuth hook
export const useAuth = () => {
  return useContext(AuthContext);
};
