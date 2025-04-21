import { Button, CircularProgress, Typography, useTheme } from '@mui/material';
import Link from '@mui/material/Link';
import { captureException } from '@sentry/react';
import { AuthResponse, SignInPage, type AuthProvider } from '@toolpad/core/SignInPage';
import { useNotifications } from '@toolpad/core/useNotifications';
import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { HOMEPAGE } from 'src/constants';
import { supabase } from '../../components/services/supabase/supabaseClient';
import { useApplication } from './AuthContext';
import Layout from 'src/components/Layout';


const LoginScreen = () => {
  const theme = useTheme();
  const notifications = useNotifications();
  const navigate = useNavigate();
  const { version, user } = useApplication();
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  if (user) {
    return <Navigate to={location.state.path ?? HOMEPAGE} />
  }

  const signIn: (provider: AuthProvider, formData: FormData | undefined) => void = async (
    provider,
    formData,
  ) => {
    const promise = new Promise<AuthResponse>((resolve) => {
      setLoading(true);
      const email = formData?.get("email")?.toString();
      const password = formData?.get("password")?.toString();
      if (email && password) {
        if (provider.id === 'credentials')
          supabase.auth
            .signInWithPassword({
              email: email,
              password: password,
            })
            .then((result) => {
              if (process.env.REACT_APP_ENV === 'production_admin' && result.data.user?.role !== 'admin') {
                throw Error('Cannot login if not user has not the admin role');
              }
              if (result.error) {
                throw result.error;
              } else if (!result.data.session) {
                throw Error('Login failed without any error message. Please try again...');
              }
            })
            .catch((error) => {
              captureException(error);
              resolve({
                type: 'CredentialsSignin',
                error: error.message,
              });
            })
            .finally(() => {
              setLoading(false);
            })
      }
      if (provider.id === 'google')
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'https://www.googleapis.com/auth/calendar',
            redirectTo: window.location.origin + "/auth/callback",
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            }
          },
        })
          .then((result) => {
            if (process.env.REACT_APP_ENV === 'production_admin') {
              throw Error('Cannot login if not user has not the admin role');
            }
            if (result.error) {
              throw result.error;
            } else if (!result.data) {
              throw Error('Login failed without any error message. Please try again...');
            }
          })
          .catch((error) => {
            notifications.show(error.message, { severity: "error" })
            captureException(error);
            resolve({
              type: 'CredentialsSignin',
              error: error.message,
            });
          })
          .finally(() => {
            setLoading(false);
          })
    });
    return promise;
  };

  function Title() {
    return <h2 style={{ marginBottom: 8, textAlign: "center" }}>Login to<br></br>Roundnet Karlsruhe</h2>;
  }

  function Subtitle() {
    return (
      <div></div>
    );
  }

  function SubmitButton() {
    return <Button
      type="submit"
      variant="contained"
      fullWidth
      disabled={loading}
      sx={{ my: 2 }}
    >
      {
        loading ? <CircularProgress color="inherit" size={25} /> : "Login"
      }
    </Button>
  }

  const SignUpLink = () => <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
    <Link href="#" variant="body2" onClick={() => navigate('/signup', { replace: true })}>
      {'Noch keinen Account?'}
    </Link>
    <Typography sx={{ mt: 1 }}>{`Version ${process.env.REACT_APP_VERSION}-${version.slice(0, 8)}`}</Typography>
  </div>

  const ForgotPasswordLink = () => <Link href="#" variant="body2" onClick={() => navigate('/forgot-password', { replace: true })}>
    Passwort vergessen?
  </Link>

  const rememberMe = () => <div></div>

  return <Layout appBarConfig={{ showProfile: false }}>
    <SignInPage
      providers={[{ id: 'credentials', name: 'Credentials' }]}
      signIn={signIn}
      slots={{
        title: Title,
        subtitle: Subtitle,
        signUpLink: SignUpLink,
        forgotPasswordLink: ForgotPasswordLink,
        rememberMe: rememberMe,
        submitButton: SubmitButton
      }}
      sx={{
        "height": "100%",
        "minHeight": "100%",
        "verticalAlign": "middle",
        "& .MuiContainer-root .MuiBox-root": {
          [theme.breakpoints.down("sm")]: {
            border: "none",
            boxShadow: "none"
          }
        }
      }}
      slotProps={{
        emailField: { autoFocus: false },
        submitButton: { title: "Einloggen" },
        rememberMe: { disabled: true, hidden: true }
      }} />
  </Layout>
};
export default LoginScreen;
