import { useClient } from 'react-supabase';
import { useDispatch, useSelector } from 'react-redux';
import React, { useCallback, useEffect, useState } from 'react';
import { ability, defineRulesFor } from '../../utils/PermissionService';
import { onUserChange } from '../../redux/applicationSlice';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import AuthPage from '../../pages/Auth.page';
import { AlertMessage, AlertSnackbar } from '../../components/AlertSnackbar';
import NotVerifiedScreen from '../../components/NotVerifiedScreen';
import { AuthContext } from './AuthContext';
import { setUser } from '@sentry/react';
import { RootState } from '../../redux/store';
import { AdminPermissionsRepository } from '../../repository/AdminPermissionsRepository';
import { SupabaseUserRepository } from '../../repository/UserRepository';
import { useLocation, useNavigate } from 'react-router-dom';
import { HOMEPAGE } from '../../constants';
import { UserWithRolesAndPermissions } from '../../types/supabaseTypes';
import { Box, CircularProgress, Typography } from '@mui/material';

type Props = {
  children: React.ReactNode;
};

export const AuthGate = ({ children }: Props) => {
  const client = useClient();
  const dispatch = useDispatch();

  const navigate = useNavigate();
  const location = useLocation();

  const currentUser = useSelector((state: RootState) => state.application.user);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

  const signOut = async () => {
    try {
      const session = client.auth.getSession(); // Prüfen, ob eine Sitzung vorhanden ist
      if (!session) {
        console.warn("No active session found, skipping sign-out.");
        reset();
        return;
      }
  
      await client.auth.signOut();
      console.log("Successfully signed out");
    } catch (error: any) {
      reset();
      console.error("Error during sign-out:", error.message);
    }
  }

  const reset = () => {
    setLoading(false);
    setSession(null);
    ability.update(defineRulesFor([], []));
    dispatch(onUserChange(null));
    setUser(null);
  }

  const handleAuthChange = useCallback(
    async (
      event: AuthChangeEvent,
      session: Session | null
    ): Promise<{
      navigateTo: string;
    } | null> => {
      if (!session || currentUser?.userId === session.user.id) {
        console.log(location.pathname)
        return null; // Keine Aktion notwendig
      }
      console.log(event, session);
      setLoading(true);
      try {
        const roles = await AdminPermissionsRepository.fetchRolesForUser(session.user.id);
        const permissions = await AdminPermissionsRepository.fetchPermissionsForRoles(roles);
        const { data: user } = await SupabaseUserRepository.fetchUser(session.user.id);
        const groups = await SupabaseUserRepository.fetchGroupsForUser(session.user.id);
        // const { data: player_data } = await SupabaseUserRepository.fetchPlayer(session.user.id);

        if (!user) {
          throw Error('Fetching user in AuthGate was not successful.');
        }
        setUser({ email: session.user.email, id: session.user.id, username: user.displayName });
        ability.update(defineRulesFor(permissions, roles));
        dispatch(
          onUserChange({
            ...user,
            roles,
            permissions,
            player_data: null,
            groups
          } satisfies UserWithRolesAndPermissions)
        );
        setSession(session);
      } catch (error) {
        console.error('Error handling auth change:', error);
        reset();
        throw error;
      } finally {
        setLoading(false);
      }
      if (event === "SIGNED_IN") {
        return { navigateTo: location.pathname === "/login" ? `/${HOMEPAGE}` : location.pathname };
      } else if (event === 'PASSWORD_RECOVERY') {
        return { navigateTo: '/reset-password' };
      } else {
        return { navigateTo: location.pathname || `/${HOMEPAGE}` };
      }
    },
    [dispatch, currentUser, location.pathname]
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      console.log('Session:', session);

      if (event === 'INITIAL_SESSION' && currentUser) {
        console.log('Skipping INITIAL_SESSION: User already loaded.');
        return;
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        ability.update(defineRulesFor([], []));
        dispatch(onUserChange(null));
        setUser(null);
      } else if (currentUser?.userId !== session?.user.id) {
        handleAuthChange(event, session)
          .then((result) => {
            if (result) navigate(result.navigateTo, { replace: true });
          })
          .catch(() => setLoading(false));
      }
    });
    return () => subscription.unsubscribe();
  }, [client, handleAuthChange, dispatch, navigate, currentUser]);

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
    <>
      {session ? (
        currentUser && currentUser.verified ? (
          <AuthContext.Provider value={{user: currentUser, signOut: signOut}}>{children}</AuthContext.Provider>
        ) : (
          <NotVerifiedScreen />
        )
      ) : (
        <AuthPage />
      )}
      <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)} />
    </>
  );
};
