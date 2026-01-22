import { AppRoutes } from '@/AppRoutes';
import { LoadingScreen } from '@/components/LoadingScreen';
import useDeviceId from '@/hooks/useDeviceId';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { authKeys, useCurrentUser } from '@/tanstack/auth';
import { captureException, setUser } from '@sentry/react';
import { Session } from '@supabase/supabase-js';
import React, { useCallback, useEffect, useState } from 'react';
import WebPushKeeper from '../push/WebPushKeeper';
import { ApplicationContext } from './ApplicationContext';

export const AuthGate = () => {
  const deviceId = useDeviceId();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: currentUser = null, isFetching } = useCurrentUser(session);

  const signOut = async () => {
    try {
      const session = supabase.auth.getSession(); // Prüfen, ob eine Sitzung vorhanden ist
      if (!session) {
        captureException(Error('Session not found while signing out.'));
        reset();
        return;
      }

      await supabase.auth.signOut();
    } catch (error: unknown) {
      reset();
      captureException(error);
    } finally {
      await queryClient.invalidateQueries();
      queryClient.removeQueries();
    }
  };

  const reset = useCallback(() => {
    setLoading(false);
    setUser(null);
    queryClient.invalidateQueries({ queryKey: authKeys.all });
  }, []);

  useEffect(() => {
    // Fetch initial session and user data
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
    });
    getInitialSession();
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading || isFetching) return <LoadingScreen />;

  return (
    <ApplicationContext
      value={{
        user: currentUser,
        signOut: signOut,
        deviceId,
        version: import.meta.env.VITE_GIT_COMMIT,
      }}
    >
      <React.Suspense fallback={<LoadingScreen />}>
        <WebPushKeeper session={session} vapidPublicKey={import.meta.env.VITE_VAPID_PUBLIC_KEY!}>
          <AppRoutes />
        </WebPushKeeper>
      </React.Suspense>
    </ApplicationContext>
  );
};
