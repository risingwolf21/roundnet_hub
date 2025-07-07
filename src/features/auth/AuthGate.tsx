import { Box, CircularProgress, Typography } from '@mui/material';
import { captureException, setTag, setUser } from '@sentry/react';
import { Session } from '@supabase/supabase-js';
import React, { useCallback, useEffect, useState } from 'react';
import { queryClient } from 'src/App';
import { AppRoutes } from 'src/AppRoutes';
import { LoadingScreen } from 'src/components/LoadingScreen';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import useDeviceId from 'src/hooks/useDeviceId';
import { BRANDING } from 'src/utils';
import { SupabaseUserRepository } from '../../repository/UserRepository';
import { UserWithGroups } from '../../types/supabaseTypes';
import { ApplicationContext } from './ApplicationContext';
import ReactGA from 'react-ga4';


export const AuthGate = () => {
  const deviceId = useDeviceId();

  const [version, setVersion] = React.useState("");

  React.useEffect(() => {
    fetch('/git_commit.txt')
      .then((r) => r.text())
      .then((text) => {
        setVersion(text);
        setTag("version", text);
      })
      .catch(e => {
        setVersion("???")
      })
  }, []);

  const [session, setSession] = useState<Session | null>(null)
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
    } catch (error: any) {
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

  const fetchUserData = useCallback(async (session: Session, abortSignal: AbortSignal) => {
    try {
      const [{ data: user, error }, groups] = await Promise.all([
        SupabaseUserRepository.fetchUser(session.user.id),
        SupabaseUserRepository.fetchGroupsForUser(session.user.id),
      ])
      if (error) {
        captureException(error)
        return;
      }

      const userData: UserWithGroups = {
        ...user,
        groups
      };
      setProviderToken(session.user.user_metadata["provider_token"])
      setUser({ email: session.user.email, id: session.user.id, username: user.displayName });
      setCurrentUser(userData);
      ReactGA.set({ userId: user.userId, displayName: user.displayName });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    if (!session) {
      reset();
    } else if (!loading && (!currentUser || session.user.id !== currentUser?.userId)) {
      setLoading(true)
      fetchUserData(session, abortController.signal)
    }

    return () => abortController.abort();
    // eslint-disable-next-line
  }, [session]);

  useEffect(() => {
    // Fetch initial session and user data
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
    });
    getInitialSession();
    return () => {
      subscription.unsubscribe();
    }
  }, []);

  if (loading)
    return (
      <Box
        sx={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography variant="h5" component="div" sx={{ mb: 2, textAlign: 'center' }}>
          🐺<br></br>{BRANDING.title}
        </Typography>
        <CircularProgress variant={'indeterminate'} size={50}></CircularProgress>
      </Box>
    );

  return (
    <ApplicationContext.Provider value={{ user: currentUser, signOut: signOut, deviceId, provider_token, version }}>
      <React.Suspense fallback={<LoadingScreen />}>
        <AppRoutes />
      </React.Suspense>
    </ApplicationContext.Provider>
  );
};
