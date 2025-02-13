import { Typography, useTheme } from '@mui/material';
import Link from '@mui/material/Link';
import { captureException } from '@sentry/react';
import { SignInPage, type AuthProvider } from '@toolpad/core/SignInPage';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../components/services/supabase/supabaseClient';
import raw from '../../git_commit.txt';


const LoginScreen = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    fetch(raw)
      .then((r) => r.text())
      .then((text) => {
        setVersion(text);
      });
  }, []);

  const signIn: (provider: AuthProvider, formData: FormData | undefined) => void = async (
    provider,
    formData,
  ) => {
    const promise = new Promise<void>((resolve) => {
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
            })
            .finally(() => {
              resolve();
            })
      }
      if (provider.id === 'google')
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'https://www.googleapis.com/auth/calendar',
            redirectTo: window.location.origin + "/auth/callback"
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
            captureException(error);
          })
          .finally(() => {
            resolve();
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

  const SignUpLink = () => <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
    <Link href="#" variant="body2" onClick={() => navigate('/register', { replace: true })}>
      {'Noch keinen Account?'}
    </Link>
    <Typography sx={{ mt: 1 }}>{`Version ${process.env.REACT_APP_VERSION}-${version.slice(0, 8)}`}</Typography>
  </div>

  const ForgotPasswordLink = () => <Link href="#" variant="body2" onClick={() => navigate('/forgot-password', { replace: true })}>
    Passwort vergessen?
  </Link>

  const rememberMe = () => <div></div>

  return <SignInPage
    providers={[{ id: 'credentials', name: 'Credentials' }, { id: 'google', name: 'google' }]}
    signIn={signIn}
    slots={{
      title: Title,
      subtitle: Subtitle,
      signUpLink: SignUpLink,
      forgotPasswordLink: ForgotPasswordLink,
      rememberMe: rememberMe
    }}
    sx={{
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
};
export default LoginScreen;
