import { Box, CircularProgress, Typography } from '@mui/material';
import { captureException, setUser } from '@sentry/react';
import { Session } from '@supabase/supabase-js';
import { useNotifications } from '@toolpad/core/useNotifications';
import { logEvent, setUserId } from 'firebase/analytics';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { analytics } from 'src/firebase/firebaseConfig';
import useDeviceId from 'src/hooks/useDeviceId';
import { HOMEPAGE } from '../../constants';
import { onUserChange } from '../../redux/applicationSlice';
import { RootState } from '../../redux/store';
import { AdminPermissionsRepository } from '../../repository/AdminPermissionsRepository';
import { SupabaseUserRepository } from '../../repository/UserRepository';
import { UserWithRolesAndPermissions } from '../../types/supabaseTypes';
import { ability, defineRulesFor } from '../../utils/PermissionService';
import { AuthContext } from './AuthContext';

type Props = {
  children: React.ReactNode;
};

export const AuthGate = ({ children }: Props) => {
  const dispatch = useDispatch();

  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useNotifications();
  const deviceId = useDeviceId();

  const currentUser = useSelector((state: RootState) => state.application.user);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
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
    setSession(null);
    ability.update(defineRulesFor([], []));
    dispatch(onUserChange(null));
    setUser(null);
  }, [dispatch]);

  const handleAuthChange = useCallback(
    async (
      session: Session | null
    ): Promise<{
      navigateTo: string;
    } | null> => {
      if (!session || currentUser?.userId === session.user.id) {
        return null; // Keine Aktion notwendig
      }
      setLoading(true);
      try {
        const roles = await AdminPermissionsRepository.fetchRolesForUser(session.user.id);
        const permissions = await AdminPermissionsRepository.fetchPermissionsForRoles(roles);
        const { data: user, error } = await SupabaseUserRepository.fetchUser(session.user.id);
        const groups = await SupabaseUserRepository.fetchGroupsForUser(session.user.id);
        const { data: player_data } = await SupabaseUserRepository.fetchPlayer(session.user.id);
        const {data: calendar_data} = await SupabaseUserRepository.fetchCalendarSettings(session.user.id);

        if (!user || error) {
          throw Error('Fetching user in AuthGate was not successful. \n' + JSON.stringify(error));
        }
        setProviderToken(session.user.user_metadata["provider_token"])
        setUserId(analytics, session.user.id);
        logEvent(analytics, "login", { id: session.user.id, username: user.displayName })
        setUser({ email: session.user.email, id: session.user.id, username: user.displayName });
        ability.update(defineRulesFor(permissions, roles));
        dispatch(
          onUserChange({
            ...user,
            roles,
            permissions,
            player_data,
            calendar_data,
            groups,
          } satisfies UserWithRolesAndPermissions)
        );
        setSession(session);
      } catch (error: any) {
        captureException(error);
        reset();
        throw error;
      } finally {
        setLoading(false);
      }
      return { navigateTo: location.pathname === '/login' || location.pathname === '/auth/callback' ? `/${HOMEPAGE}` : location.pathname };
    },
    [dispatch, reset, currentUser, location.pathname]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log(session)
      setSession(session);
      if (session === null) {
        reset();
      } else if (session.user.id !== currentUser?.userId) {
        handleAuthChange(session)
          .then((result) => {
            if (result) navigate(result.navigateTo, { replace: true });
          })
          .catch((error) => {
            setLoading(false);
            notifications.show(error.message, { severity: "error" })
          });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'INITIAL_SESSION' && currentUser) {
        return;
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        ability.update(defineRulesFor([], []));
        dispatch(onUserChange(null));
        setUser(null);
      } else if (currentUser?.userId !== session?.user.id) {
        handleAuthChange(session)
          .then((result) => {
            if (result) navigate(result.navigateTo, { replace: true });
          })
          .catch((error) => {
            setLoading(false);
            notifications.show(error.message, { severity: "error" })
          });
      }
    });
    return () => subscription.unsubscribe();
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
    <AuthContext.Provider value={{ user: currentUser, signOut: signOut, deviceId, session, provider_token }}>
      {children}
    </AuthContext.Provider>
  );
};
