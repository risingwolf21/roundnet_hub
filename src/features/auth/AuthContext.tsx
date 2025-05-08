import { createContext, useContext } from 'react';
import { UserWithRolesAndPermissions } from '../../types/supabaseTypes';

export const AuthContext = createContext<{
  user: UserWithRolesAndPermissions;
  signOut: () => void;
}>(null!);

// export the useAuth hook
export const useAuthentication = () => {
  return useContext(AuthContext);
};
