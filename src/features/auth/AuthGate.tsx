import { AppRoutes } from '@/AppRoutes';
import { LoadingScreen } from '@/components/LoadingScreen';
import { getDeviceId } from '@/hooks/useDeviceId';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from '@/tanstack/auth';
import { Session } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import WebPushKeeper from '../push/WebPushKeeper';
import { ApplicationContext } from './ApplicationContext';
import { signOut } from './signOut';
import { useUserGrantsQuery } from './tanstack/useUserGrantsQuery';

export const AuthGate = () => {
  const deviceId = getDeviceId();

  const [session, setSession] = useState<Session | null>(null);
  const [isAuthRestored, setIsAuthRestored] = useState(false);

  const { data: currentUser = null, isFetching } = useCurrentUser(session);

  useUserGrantsQuery(currentUser?.id);

  // The saved language of the account wins over what the device remembered.
  const { i18n } = useTranslation();
  useEffect(() => {
    if (currentUser?.language) i18n.changeLanguage(currentUser.language);
  }, [currentUser?.language, i18n]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthRestored(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isInitialLoading = !isAuthRestored || (!!session && !currentUser && isFetching);

  if (isInitialLoading) return <LoadingScreen />

  return (
    <ApplicationContext
      value={{
        user: currentUser,
        signOut,
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