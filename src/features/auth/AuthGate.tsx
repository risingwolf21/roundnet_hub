import { AppRoutes } from '@/AppRoutes';
import { LoadingScreen } from '@/components/LoadingScreen';
import useDeviceId from '@/hooks/useDeviceId';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { captureException, setUser } from '@sentry/react';
import { Session } from '@supabase/supabase-js';
import React, { useCallback, useEffect, useState } from 'react';
import { SupabaseUserRepository } from '../../repository/UserRepository';
import { UserWithGroups } from '../../types/supabaseTypes';
import WebPushKeeper from '../push/WebPushKeeper';
import { ApplicationContext } from './ApplicationContext';


export const AuthGate = () => {
  const deviceId = useDeviceId();

  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<UserWithGroups | null>(null);
  const [loading, setLoading] = useState(false);
  const [provider_token, setProviderToken] = useState<string | null>(null);

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
    setCurrentUser(null);
    setProviderToken(null);
  }, []);

  const fetchUserData = useCallback(async (session: Session) => {
    try {
      const [{ data: user, error }, groups] = await Promise.all([
        SupabaseUserRepository.fetchUser(session.user.id),
        SupabaseUserRepository.fetchGroupsForUser(session.user.id),
      ]);
      if (error) {
        captureException(error);
        return;
      }

      const userData: UserWithGroups = {
        ...user,
        groups,
      };
      setProviderToken(session.user.user_metadata['provider_token']);
      setUser({ email: session.user.email, id: session.user.id, username: user.displayName });
      setCurrentUser(userData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) {
      reset();
    } else if (!loading && (!currentUser || session.user.id !== currentUser?.id)) {
      setLoading(true);
      fetchUserData(session);
    }

  }, [session]);

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

  if (loading)
    return <LoadingScreen />

  return (
    <ApplicationContext
      value={{
        user: currentUser,
        signOut: signOut,
        deviceId,
        provider_token,
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
