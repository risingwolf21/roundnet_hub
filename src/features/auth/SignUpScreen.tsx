import { Alert, alpha, CircularProgress, Container, Stack, SvgIcon, SxProps, Theme, Typography, useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import { captureException } from '@sentry/react';
import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { HOMEPAGE } from 'src/constants';
import { BRANDING } from 'src/utils';
import { useApplication } from './AuthContext';
import Layout from 'src/components/Layout';

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
        typeof baseProps.slotProps?.htmlInput === 'function' ? {} : baseProps.slotProps?.htmlInput,
      ),
    },
    inputLabel: {
      ...baseProps.slotProps?.inputLabel,
      sx: mergeSlotSx(
        {
          lineHeight: theme.typography.pxToRem(12),
          fontSize: theme.typography.pxToRem(14),
        },
        typeof baseProps.slotProps?.inputLabel === 'function'
          ? {}
          : baseProps.slotProps?.inputLabel,
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

  if (user) {
    return <Navigate to={HOMEPAGE} />
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
          name: name + " " + surname,
          displayName: name,
          email,
          role: 'user',
        }
      }
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
    <Layout appBarConfig={{ showProfile: false }}>
      <Box
        sx={(theme) => ({
          height: '100%',
          minHeight: "100%",
          mb: "env(safe-area-inset-bottom)",
          mt: "env(safe-area-inset-top)",
          display: 'flex',
          flexDirection: 'column',
          overflow: "hidden",
          overflowY: "auto",
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
                border: "none",
                boxShadow: "none"
              },
            })}
          >

            {BRANDING.logo}

            <Typography variant="h5" component={"h1"} color='textPrimary' sx={{
              my: theme.spacing(1),
              textAlign: 'center',
              fontWeight: 600,
            }}>
              Register at<br></br>{BRANDING.title}
            </Typography>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ width: "100%" }}
            >
              <Stack direction={"column"} spacing={2} sx={{ mb: 2 }}>
                <TextField
                  {...getCommonTextFieldProps(theme, {
                    label: "Email",
                    placeholder: 'your@email.com',
                    id: 'email',
                    name: 'email',
                    type: 'email',
                    autoComplete: 'email'
                  })}
                />
                <TextField
                  {...getCommonTextFieldProps(theme, {
                    label: "Vorname",
                    placeholder: 'Max',
                    id: 'name',
                    name: 'name'
                  })}
                />
                <TextField
                  {...getCommonTextFieldProps(theme, {
                    label: "Nachname",
                    placeholder: 'Mustermann',
                    id: 'surname',
                    name: 'surname'
                  })}
                />
                <TextField
                  {...getCommonTextFieldProps(theme, {
                    label: "Password",
                    id: 'password',
                    name: 'password',
                    type: "password"
                  })}
                />
                <TextField
                  {...getCommonTextFieldProps(theme, {
                    label: "Password",
                    id: 'password2',
                    name: 'password2',
                    type: "password"
                  })}
                />

                {
                  error && <Alert sx={{ my: 2 }} severity="error">
                    {error}
                  </Alert>
                }
              </Stack>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{ my: 2 }}
              >
                {
                  loading ? <CircularProgress color="inherit" size={25} /> : "Registrieren"
                }
              </Button>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Link href="#" variant="body2" onClick={() => navigate('/login', { replace: true })}>
                  {'Account vorhanden? Hier einloggen'}
                </Link>
                <Typography sx={{ mt: 1 }}>{`Version ${process.env.REACT_APP_VERSION}-${version.slice(0, 8)}`}</Typography>
              </div>
            </Box>
          </Box>
        </Container>
      </Box>
    </Layout>
  );
}

export default SignUpScreen;

export function GoogleIcon() {
  return (
    <SvgIcon>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15.68 8.18182C15.68 7.61455 15.6291 7.06909 15.5345 6.54545H8V9.64364H12.3055C12.1164 10.64 11.5491 11.4836 10.6982 12.0509V14.0655H13.2945C14.8073 12.6691 15.68 10.6182 15.68 8.18182Z"
          fill="#4285F4"
        />
        <path
          d="M8 16C10.16 16 11.9709 15.2873 13.2945 14.0655L10.6982 12.0509C9.98545 12.5309 9.07636 12.8218 8 12.8218C5.92 12.8218 4.15273 11.4182 3.52 9.52727H0.858182V11.5927C2.17455 14.2036 4.87273 16 8 16Z"
          fill="#34A853"
        />
        <path
          d="M3.52 9.52C3.36 9.04 3.26545 8.53091 3.26545 8C3.26545 7.46909 3.36 6.96 3.52 6.48V4.41455H0.858182C0.312727 5.49091 0 6.70545 0 8C0 9.29455 0.312727 10.5091 0.858182 11.5855L2.93091 9.97091L3.52 9.52Z"
          fill="#FBBC05"
        />
        <path
          d="M8 3.18545C9.17818 3.18545 10.2255 3.59273 11.0618 4.37818L13.3527 2.08727C11.9636 0.792727 10.16 0 8 0C4.87273 0 2.17455 1.79636 0.858182 4.41455L3.52 6.48C4.15273 4.58909 5.92 3.18545 8 3.18545Z"
          fill="#EA4335"
        />
      </svg>
    </SvgIcon>
  );
}