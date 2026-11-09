import { createContext, use } from 'react';
import { UserWithGroups } from '../../types/supabaseTypes';

export const ApplicationContext = createContext<{
  user: UserWithGroups | null;
  deviceId: string;
  signOut: () => void;
  version: string;
}>(null!);

// export the useAuth hook
export const useApplication = () => {
  return use(ApplicationContext);
};
