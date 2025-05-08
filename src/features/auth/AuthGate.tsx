import { Box, CircularProgress, Typography } from '@mui/material';
import { captureException, setUser } from '@sentry/react';
import { Session } from '@supabase/supabase-js';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppRoutes } from 'src/AppRoutes';
import { LoadingScreen } from 'src/components/LoadingScreen';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import useDeviceId from 'src/hooks/useDeviceId';
import raw from '../../git_commit.txt';
import { onUserChange } from '../../redux/applicationSlice';
import { AdminPermissionsRepository } from '../../repository/AdminPermissionsRepository';
import { SupabaseUserRepository } from '../../repository/UserRepository';
import { UserWithRolesAndPermissions } from '../../types/supabaseTypes';
import { ability, defineRulesFor } from '../../utils/PermissionService';
import { ApplicationContext } from './AuthContext';


export const AuthGate = () => {
  const dispatch = useDispatch();
  const deviceId = useDeviceId();

  const [version, setVersion] = React.useState("");

  React.useEffect(() => {
    fetch(raw)
      .then((r) => r.text())
      .then((text) => {
        setVersion(text);
      });
  }, []);

  const [session, setSession] = useState<Session | null>(null)
  const [currentUser, setCurrentUser] = useState<UserWithRolesAndPermissions | null>(null);
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
    }
  };

  const reset = useCallback(() => {
    setLoading(false);
    ability.update(defineRulesFor([], []));
    dispatch(onUserChange(null));
    setUser(null);
    setCurrentUser(null);
    setProviderToken(null);
  }, [dispatch]);

  const fetchUserData = useCallback(async (session: Session, abortSignal: AbortSignal) => {
    try {
      const roles = await AdminPermissionsRepository.fetchRolesForUser(session.user.id);
      const [permissions, { data: user, error }, groups, { data: player_data }, { data: calendar_data }] = await Promise.all([
        AdminPermissionsRepository.fetchPermissionsForRoles(roles),
        SupabaseUserRepository.fetchUser(session.user.id),
        SupabaseUserRepository.fetchGroupsForUser(session.user.id),
        SupabaseUserRepository.fetchPlayer(session.user.id),
        SupabaseUserRepository.fetchCalendarSettings(session.user.id),
      ])
      if (!user || error)
        return;

      const userData: UserWithRolesAndPermissions = {
        ...user,
        roles,
        permissions,
        player_data,
        calendar_data,
        groups,
      };
      setProviderToken(session.user.user_metadata["provider_token"])
      setUser({ email: session.user.email, id: session.user.id, username: user.displayName });
      ability.update(defineRulesFor(permissions, roles));
      setCurrentUser(userData);
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
          🐺<br></br>Roundnet Karlsruhe
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
