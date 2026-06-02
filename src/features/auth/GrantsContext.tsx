// src/features/grants/GrantsProvider.tsx
import { LoadingScreen } from '@/components/LoadingScreen';
import type { UserWithGroups } from '@/types/supabaseTypes';
import * as React from 'react';
import { signOut as performSignOut } from './signOut';
import { useUserGrantsQuery } from './tanstack/useUserGrantsQuery';

type GrantsContextValue = ReturnType<typeof useUserGrantsQuery> & {
  user: UserWithGroups;
  signOut: () => void;
};

const GrantsContext = React.createContext<GrantsContextValue | null>(null);

type Props = { user: UserWithGroups; children: React.ReactNode };

export function GrantsProvider({ user, children }: Props) {
  const grantsQuery = useUserGrantsQuery(user.id);

  const signOut = React.useCallback(() => performSignOut(), []);

  const value = React.useMemo<GrantsContextValue>(
    () => ({ user, signOut, ...grantsQuery }),
    [user, grantsQuery, signOut]
  );

  if (grantsQuery.loading) return <LoadingScreen />;

  return <GrantsContext value={value}>{children}</GrantsContext>;
}

export function useGrants() {
  const ctx = React.use(GrantsContext);
  if (!ctx) throw new Error('useGrants must be used within <GrantsProvider>');
  return ctx;
}
