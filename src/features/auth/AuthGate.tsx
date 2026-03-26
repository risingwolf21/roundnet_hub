import { AppRoutes } from '@/AppRoutes';
import { LoadingScreen } from '@/components/LoadingScreen';
import useDeviceId from '@/hooks/useDeviceId';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from '@/tanstack/auth';
import { TENANT_LOGO } from '@/utils';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import { captureException } from '@sentry/react';
import { Session } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import WebPushKeeper from '../push/WebPushKeeper';
import { ApplicationContext } from './ApplicationContext';
import { useUserGrantsQuery } from './tanstack/useUserGrantsQuery';

export const AuthGate = () => {
  const deviceId = useDeviceId();

  const [session, setSession] = useState<Session | null>(null);
  const [isAuthRestored, setIsAuthRestored] = useState(false);

  const { data: currentUser = null, isFetching } = useCurrentUser(session);

  useUserGrantsQuery(currentUser?.id);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      queryClient.clear();
    } catch (error) {
      captureException(error);
    }
  };

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

  const isInitialLoading = !isAuthRestored || (!!session && isFetching);

  if (isInitialLoading) return <Box
    sx={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      flexDirection: 'column',
      alignItems: 'center',
    }}
  >
    <LinearProgress sx={{ position: "absolute", left: 0, right: 0, top: 0 }} variant='indeterminate' />
    {
      <img src={TENANT_LOGO} alt="MUI logo" style={{ height: 125, objectFit: 'contain' }} />
    }
  </Box>

  return (
    <ApplicationContext
      value={{
        user: currentUser,
        signOut: handleSignOut,
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
