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

  const onLoggedIn = (session: Session) => {
    handleAuthChange('SIGNED_IN', session)
      .then((result) => {
        navigate(result.navigateTo, { replace: true });
      })
      .catch(() => {
        setLoading(false);
        setSession(null);
        ability.update(defineRulesFor([], []));
        dispatch(onUserChange(null));
        setUser(null);
      });
  };

  const handleAuthChange = useCallback(
    async (
      event: AuthChangeEvent,
      session: Session | null
    ): Promise<{
      navigateTo: string;
    }> => {
      console.log(event, session);
      setLoading(true);
      if (!session) throw Error('Session was null');
      const roles = await AdminPermissionsRepository.fetchRolesForUser(session.user.id);
      const permissions = await AdminPermissionsRepository.fetchPermissionsForRoles(roles);
      const { data: user } = await SupabaseUserRepository.fetchUser(session.user.id);
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
        } satisfies UserWithRolesAndPermissions)
      );
      setSession(session);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') {
        return { navigateTo: '/reset-password' };
      } else if (location.pathname) {
        return { navigateTo: location.pathname };
      } else {
        return { navigateTo: `/${HOMEPAGE}` };
      }
    },
    [dispatch]
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') return;
      handleAuthChange(event, session)
        .then((result) => {
          navigate(result.navigateTo, { replace: true });
        })
        .catch(() => {
          setLoading(false);
          setSession(null);
          ability.update(defineRulesFor([], []));
          dispatch(onUserChange(null));
          setUser(null);
        });
    });
    return () => subscription.unsubscribe();
  }, [client, handleAuthChange, dispatch, navigate]);

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
          <AuthContext.Provider value={currentUser}>{children}</AuthContext.Provider>
        ) : (
          <NotVerifiedScreen />
        )
      ) : (
        <AuthPage onLoggedIn={onLoggedIn} />
      )}
      <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)} />
    </>
  );
};
