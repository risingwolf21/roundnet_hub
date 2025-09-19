import { Alert, alpha, CircularProgress, Container, Stack, SxProps, Theme, Typography, useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import { captureException } from '@sentry/react';
import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { HOMEPAGE } from '@/constants';
import { BRANDING } from '@/utils';
import { useApplication } from './ApplicationContext';

const mergeSlotSx = (defaultSx: SxProps<Theme>, slotProps?: { sx?: SxProps<Theme> }) => {
  if (Array.isArray(slotProps?.sx)) {
    return [defaultSx, ...slotProps.sx];
  }

  if (slotProps?.sx) {
    return [defaultSx, slotProps?.sx];
  }

  return [defaultSx];
};

export const getCommonTextFieldProps = (theme: Theme, baseProps: TextFieldProps = {}): TextFieldProps => ({
  required: true,
  fullWidth: true,
  ...baseProps,
  slotProps: {
    ...baseProps.slotProps,
    htmlInput: {
      ...baseProps.slotProps?.htmlInput,
      sx: mergeSlotSx(
        {
          paddingTop: theme.spacing(1),
          paddingBottom: theme.spacing(1),
        },
        typeof baseProps.slotProps?.htmlInput === 'function' ? {} : baseProps.slotProps?.htmlInput
      ),
    },
    inputLabel: {
      ...baseProps.slotProps?.inputLabel,
      sx: mergeSlotSx(
        {
          lineHeight: theme.typography.pxToRem(12),
          fontSize: theme.typography.pxToRem(14),
        },
        typeof baseProps.slotProps?.inputLabel === 'function' ? {} : baseProps.slotProps?.inputLabel
      ),
    },
  },
});

const SignUpScreen = () => {
  const [error, setError] = React.useState('');

  const [loading, setLoading] = useState(false);

  const theme = useTheme();
  const navigate = useNavigate();
  const { version, user } = useApplication();
  const location = useLocation();

  if (user) {
    return <Navigate to={location.state?.path !== '/auth/login' ? location.state?.path || HOMEPAGE : HOMEPAGE} />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    setLoading(true);
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    const password2 = formData.get('password2')?.toString();
    const name = formData.get('name')?.toString();
    const surname = formData.get('surname')?.toString();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (password !== password2) {
      setError('Die Passwörter stimmen nicht überein.');
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen beinhalten');
      setLoading(false);
      return;
    }

    if (!name || name.length < 1) {
      setError('Name is required.');
      setLoading(false);
      return;
    }

    if (!surname || surname.length < 1) {
      setError('Surname is required.');
      setLoading(false);
      return;
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name + ' ' + surname,
          displayName: name,
          email,
          role: 'user',
        },
      },
    });
    if (error || !data || !data.user) {
      captureException(new Error('Could not sign up user.'), (scope) => {
        scope.clear();
        scope.setExtra('displayName', name);
        scope.setExtra('email', email);
        scope.setExtra('error', JSON.stringify(error));
        return scope;
      });
      setError('Could not sign up user. [' + error?.message + ']');
    }
    setLoading(false);
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
            Register at<br></br>
            {BRANDING.title}
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Stack direction={'column'} spacing={2} sx={{ mb: 2 }}>
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
              <TextField
                {...getCommonTextFieldProps(theme, {
                  label: 'Vorname',
                  placeholder: 'Max',
                  id: 'name',
                  name: 'name',
                })}
              />
              <TextField
                {...getCommonTextFieldProps(theme, {
                  label: 'Nachname',
                  placeholder: 'Mustermann',
                  id: 'surname',
                  name: 'surname',
                })}
              />
              <TextField
                {...getCommonTextFieldProps(theme, {
                  label: 'Password',
                  id: 'password',
                  name: 'password',
                  type: 'password',
                })}
              />
              <TextField
                {...getCommonTextFieldProps(theme, {
                  label: 'Password',
                  id: 'password2',
                  name: 'password2',
                  type: 'password',
                })}
              />

              {error && (
                <Alert sx={{ my: 2 }} severity="error">
                  {error}
                </Alert>
              )}
            </Stack>

            <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ my: 2 }}>
              {loading ? <CircularProgress color="inherit" size={25} /> : 'Registrieren'}
            </Button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Link href="#" variant="body2" onClick={() => navigate('/auth/login', { replace: true })}>
                {'Account vorhanden? Hier einloggen'}
              </Link>
              <Typography sx={{ mt: 1 }}>{`Version ${APP_VERSION}-${version.slice(0, 8)}`}</Typography>
            </div>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default SignUpScreen;
