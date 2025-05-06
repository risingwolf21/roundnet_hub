import { createContext, useContext } from 'react';
import { UserWithRolesAndPermissions } from '../../types/supabaseTypes';

export const ApplicationContext = createContext<{
  user: UserWithRolesAndPermissions | null;
  deviceId: string;
  signOut: () => void;
  provider_token: string | null;
  version: string;
}>(null!);

// export the useAuth hook
export const useApplication = () => {
  return useContext(ApplicationContext);
};
