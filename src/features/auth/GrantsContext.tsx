// src/features/grants/GrantsProvider.tsx
import { LoadingScreen } from '@/components/LoadingScreen';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { UserWithGroups } from '@/types/supabaseTypes';
import { captureException } from '@sentry/react';
import * as React from 'react';
import { useUserGrantsQuery } from './tanstack/useUserGrantsQuery';

type GrantsContextValue = ReturnType<typeof useUserGrantsQuery> & {
  user: UserWithGroups;
  signOut: () => void;
};

const GrantsContext = React.createContext<GrantsContextValue | null>(null);

type Props = { user: UserWithGroups; children: React.ReactNode };

export function GrantsProvider({ user, children }: Props) {
  const grantsQuery = useUserGrantsQuery(user.id);

  const signOut = React.useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error: unknown) {
      captureException(error);
    } finally {
      // Query Cache hart säubern – Nutzerkontext ist weg
      try {
        await queryClient.cancelQueries();
        await queryClient.invalidateQueries({ queryKey: ['user-grants', user.id] })
        queryClient.clear();
      } catch { /* empty */ }
    }
  }, []);

  const value = React.useMemo<GrantsContextValue>(
    () => ({ user, signOut, ...grantsQuery }),
    [user, grantsQuery, signOut]
  );

  if (grantsQuery.isEmpty && grantsQuery.loading)
    return <LoadingScreen />

  return <GrantsContext value={value}>{children}</GrantsContext>;
}

export function useGrants() {
  const ctx = React.use(GrantsContext);
  if (!ctx) throw new Error('useGrants must be used within <GrantsProvider>');
  return ctx;
}
