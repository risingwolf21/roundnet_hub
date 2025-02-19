import { createContext, useContext } from 'react';
import { UserWithRolesAndPermissions } from '../../types/supabaseTypes';
import { Session } from '@supabase/supabase-js';

export const ApplicationContext = createContext<{
  user: UserWithRolesAndPermissions | null;
  deviceId: string;
  signOut: () => void;
  session: Session | null;
  provider_token: string | null;
  version: string;
}>(null!);

// export the useAuth hook
export const useApplication = () => {
  return useContext(ApplicationContext);
};
