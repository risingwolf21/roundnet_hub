import { AppRoutes } from '@/AppRoutes';
import { LoadingScreen } from '@/components/LoadingScreen';
import useDeviceId from '@/hooks/useDeviceId';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from '@/tanstack/auth';
import { captureException, setUser } from '@sentry/react';
import { Session } from '@supabase/supabase-js';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import WebPushKeeper from '../push/WebPushKeeper';
import { ApplicationContext } from './ApplicationContext';
import { useUserGrantsQuery } from './tanstack/useUserGrantsQuery';

export const AuthGate = () => {
  const deviceId = useDeviceId();

  const [session, setSession] = useState<Session | null>(null);
  const [isAuthRestored, setIsAuthRestored] = useState(false);

  const { data: currentUser = null, isFetching } = useCurrentUser(session);

  useUserGrantsQuery(currentUser?.id);

  const handleSignOut = useCallback(async () => {
    try {
      // stop in-flight queries and clear cache
      await queryClient.cancelQueries();
      // preserve API: keep calling clear() as before (QueryClient may not provide clear in all versions)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      queryClient.clear && queryClient.clear();

      await supabase.auth.signOut();

      // unset Sentry user
      try { setUser(null); } catch (e) { /* ignore */ }
    } catch (error) {
      captureException(error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await supabase.auth.getSession();
        if (!mounted) return;
        const s = (res as any)?.data?.session ?? null;
        setSession(s);
      } catch (err) {
        captureException(err);
      } finally {
        if (mounted) setIsAuthRestored(true);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_OUT') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        queryClient.clear && queryClient.clear();
      }
    });

    return () => {
      mounted = false;
      try { subscription?.unsubscribe?.(); } catch (e) { /* ignore */ }
    };
  }, []);

  const isInitialLoading = !isAuthRestored || (!!session && !currentUser && isFetching);

  if (isInitialLoading) return <LoadingScreen />

  const contextValue = useMemo(() => ({
    user: currentUser,
    signOut: handleSignOut,
    deviceId,
    version: import.meta.env.VITE_GIT_COMMIT,
  }), [currentUser, handleSignOut, deviceId]);

  // set Sentry user context when currentUser changes
  useEffect(() => {
    try {
      if (currentUser) {
        setUser({ id: (currentUser as any).id, email: (currentUser as any).email });
      } else {
        setUser(null);
      }
    } catch (e) {
      // ignore
    }
  }, [currentUser]);

  return (
    <ApplicationContext value={contextValue}>
      <React.Suspense fallback={<LoadingScreen />}>
        <WebPushKeeper session={session} vapidPublicKey={import.meta.env.VITE_VAPID_PUBLIC_KEY!}>
          <AppRoutes />
        </WebPushKeeper>
      </React.Suspense>
    </ApplicationContext>
  );
};
