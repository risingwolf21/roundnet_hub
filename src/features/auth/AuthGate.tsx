import { Box, CircularProgress, Typography } from '@mui/material';
import { captureException, setUser } from '@sentry/react';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { useClient } from 'react-supabase';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { AlertMessage, AlertSnackbar } from '../../components/AlertSnackbar';
import NotVerifiedScreen from '../../components/NotVerifiedScreen';
import { HOMEPAGE } from '../../constants';
import AuthPage from '../../pages/Auth.page';
import { onUserChange, onUserDatabaseUpdate } from '../../redux/applicationSlice';
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
      event: AuthChangeEvent,
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

        if (!user || error) {
          throw Error('Fetching user in AuthGate was not successful. \n' + JSON.stringify(error));
        }
        setUser({ email: session.user.email, id: session.user.id, username: user.displayName });
        ability.update(defineRulesFor(permissions, roles));
        dispatch(
          onUserChange({
            ...user,
            roles,
            permissions,
            player_data,
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
      if (event === 'PASSWORD_RECOVERY') {
        return { navigateTo: '/reset-password' };
      } else {
        return { navigateTo: location.pathname === '/login' ? `/${HOMEPAGE}` : location.pathname };
      }
    },
    [dispatch, reset, currentUser, location.pathname]
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && currentUser) {
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
          .catch((error) => {
            setLoading(false);
            setAlertInfo({ message: error.message, severity: 'error' });
          });
      }
    });
    return () => subscription.unsubscribe();
  }, [client, handleAuthChange, dispatch, navigate, currentUser]);

  useEffect(() => {
    if (!currentUser)
      return;
    let subscription = client
      .channel('public:user')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user',
        },
        (payload) => dispatch(onUserDatabaseUpdate(payload.new))
      )
      .subscribe(console.log);
    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser])

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
          <AuthContext.Provider value={{ user: currentUser, signOut: signOut }}>{children}</AuthContext.Provider>
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
