import { Alert, alpha, CircularProgress, Stack, SxProps, Theme, useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BRANDING } from '@/utils';
import { supabase } from '@/lib/supabase';
import { HOMEPAGE } from '../../constants';

const mergeSlotSx = (defaultSx: SxProps<Theme>, slotProps?: { sx?: SxProps<Theme> }) => {
  if (Array.isArray(slotProps?.sx)) {
    return [defaultSx, ...slotProps.sx];
  }

  if (slotProps?.sx) {
    return [defaultSx, slotProps?.sx];
  }

  return [defaultSx];
};

const getCommonTextFieldProps = (theme: Theme, baseProps: TextFieldProps = {}): TextFieldProps => ({
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

const ResetPasswordScreen = () => {
  const theme = useTheme();
  const [error, setError] = React.useState('');
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  const navigate = useNavigate();

  // iOS-Standalone erkennen
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    (navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

  if (isIOS && isStandalone) {
    const unlockOnFocus = () => {
      if (document.activeElement?.matches('input, textarea, [contenteditable="true"]')) {
        document.body.style.overflow = 'auto'; // sicherstellen, dass kein Body-Lock aktiv ist
      }
    };
    window.addEventListener('focusin', unlockOnFocus);
    window.addEventListener('touchend', unlockOnFocus, { passive: true });
  }

  useEffect(() => {
    // Get the access token and refresh token from the URL
    if (typeof window !== 'undefined') {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      setAccessToken(hashParams.get('access_token') || '');
      setRefreshToken(hashParams.get('refresh_token') || '');
    }
  }, []);

  useEffect(() => {
    // Authenticate the user using the access token and refresh token
    const getSessionWithTokens = async () => {
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          alert(`Error signing in: ${error.message}`);
        }
      }
    };

    // Call this function only when accessToken and refreshToken are available.
    if (accessToken && refreshToken) {
      getSessionWithTokens();
    }
  }, [accessToken, refreshToken]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const password = data.get('password')?.toString();
    const password1 = data.get('password1')?.toString();

    if (password !== password1 || !password || !password1) {
      setError('Die Passwörter stimmen nicht überein!');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else {
      await new Promise((r) => setTimeout(r, 2000));
      setLoading(false);
      setError('');
      navigate(`/${HOMEPAGE}`, { replace: true });
    }
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
            Passwort zurücksetzen<br></br>
            {BRANDING.title}
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Stack direction={'column'} spacing={2} sx={{ mb: 2, mt: 2 }}>
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
                  id: 'password1',
                  name: 'password1',
                  type: 'password',
                })}
              />
              {loading && (
                <Alert sx={{ my: 2 }} severity="info">
                  Passwort wird geändert... Bitte warten
                </Alert>
              )}
              {error && (
                <Alert sx={{ my: 2 }} severity="error">
                  {error}
                </Alert>
              )}
            </Stack>

            <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ my: 2 }}>
              {loading ? <CircularProgress color="inherit" size={25} /> : 'Abschicken'}
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};
export default ResetPasswordScreen;
