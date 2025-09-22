import { HOMEPAGE } from '@/constants';
import { supabase } from '@/lib/supabase';
import { BRANDING } from '@/utils';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useNotifications } from '@toolpad/core/useNotifications';
import * as React from 'react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useApplication } from './ApplicationContext';
import { getCommonTextFieldProps } from './SignUpScreen';

import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import alpha from '@mui/material/alpha';
import useTheme from '@mui/material/useTheme';

const ForgotPasswordScreen = () => {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const { version, user } = useApplication();
  const location = useLocation();

  if (user) {
    return <Navigate to={location.state?.path !== '/auth/login' ? location.state?.path || HOMEPAGE : HOMEPAGE} />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email')?.toString();

    if (email) {
      supabase.auth
        .resetPasswordForEmail(email, {
          redirectTo: import.meta.env.VITE_PUBLIC_URL + '/auth/reset-password',
        })
        .then((result) => {
          if (result.error) notifications.show(result.error.message, { severity: 'error' });
          else notifications.show('Schau in dein Email Postfach um dein Passwort zu ändern.', { severity: 'success' });
        })
        .catch((error) => {
          notifications.show(error.message, { severity: 'error' });
        });
    }
    const { data, error } = await supabase
      .from('group_user_mapping')
      .select('*, user(*), group(*)')
      .eq('group.name', 'Super Admins');
    if (error || !data) {
      setLoading(false);
      return;
    }

    // await supabase.from("notifications").insert(data.map(x => ({
    //   user: x.user.userId,
    //   title: "Password reset request",
    //   body: `${email} wants to reset the password.`
    // })))
  };

  return (
    <Box
      sx={(theme) => ({
        height: '100%',
        minHeight: '100%',
        mb: 'env(safe-area-inset-bottom)',
        mt: 'env(safe-area-inset-top)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        overflowY: 'auto',
        [theme.breakpoints.up('sm')]: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        [theme.breakpoints.down('xs')]: {
          justifyContent: 'start',
          alignItems: 'start',
        },
      })}
    >
      <Container component="main" maxWidth="xs">
        <Box
          sx={(theme) => ({
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            borderRadius: 1,
            p: 4,
            mb: 10,
            [theme.breakpoints.up('sm')]: {
              border: '1px solid',
              alignItems: 'center',
              borderColor: alpha(theme.palette.grey[400], 0.4),
              boxShadow: theme.shadows[4],
              marginBottom: 0,
            },
            [theme.breakpoints.down('xs')]: {
              alignItems: 'start',
              border: 'none',
              boxShadow: 'none',
            },
          })}
        >
          {BRANDING.logo}

          <Typography
            variant="h5"
            component={'h1'}
            color="textPrimary"
            sx={{
              my: theme.spacing(1),
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            Passwort zurücksetzen
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Stack direction={'column'} spacing={2} sx={{ mb: 2, mt: 2 }}>
              <TextField
                {...getCommonTextFieldProps(theme, {
                  label: 'Email',
                  placeholder: 'your@email.com',
                  id: 'email',
                  name: 'email',
                  type: 'email',
                  autoComplete: 'email',
                })}
              />
            </Stack>

            <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ my: 2 }}>
              {loading ? <CircularProgress color="inherit" size={25} /> : 'Abschicken'}
            </Button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Link href="#" variant="body2" onClick={() => navigate('/auth/login', { replace: true })}>
                Hier einloggen
              </Link>
              <Typography sx={{ mt: 1 }}>{`Version ${APP_VERSION}-${version.slice(0, 8)}`}</Typography>
            </div>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};
export default ForgotPasswordScreen;
