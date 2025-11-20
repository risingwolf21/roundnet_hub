import { supabase } from '@/lib/supabase';
import { BRANDING, iOS } from '@/utils';
import Link from '@mui/material/Link';
import { captureException } from '@sentry/react';
import { AuthResponse, SignInPage, type AuthProvider } from '@toolpad/core/SignInPage';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useApplication } from './ApplicationContext';

import { useTheme } from '@mui/material';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

function Title() {
  return (
    <h2 style={{ marginBottom: 8, textAlign: 'center' }}>
      Login to<br></br>
      {BRANDING.title}
    </h2>
  );
}

const LoginScreen = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { version, user } = useApplication();
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const home = import.meta.env.VITE_APP_HOMEPAGE;

  // iOS-Standalone erkennen
  const isStandalone =
    (navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

  if (iOS && isStandalone) {
    const unlockOnFocus = () => {
      if (document.activeElement?.matches('input, textarea, [contenteditable="true"]')) {
        document.body.style.overflow = 'auto'; // sicherstellen, dass kein Body-Lock aktiv ist
      }
    };
    window.addEventListener('focusin', unlockOnFocus);
    window.addEventListener('touchend', unlockOnFocus, { passive: true });
  }

  if (user) {
    return <Navigate to={location.state?.path !== '/auth/login' ? location.state?.path || home : home} />;
  }

  const signIn: (provider: AuthProvider, formData: FormData | undefined) => void = async (provider, formData) => {
    const promise = new Promise<AuthResponse>((resolve) => {
      setLoading(true);
      const email = formData?.get('email')?.toString();
      const password = formData?.get('password')?.toString();
      if (email && password) {
        if (provider.id === 'credentials')
          supabase.auth
            .signInWithPassword({
              email: email,
              password: password,
            })
            .then((result) => {
              if (import.meta.env.VITE_ENV === 'production_admin' && result.data.user?.role !== 'admin') {
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
            });
      }
    });
    return promise;
  };

  const rememberMe = () => <div></div>;

  const subtitle = () => <div></div>;

  const submitButton = () => {
    return (
      <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ my: 2 }}>
        {loading ? <CircularProgress color="inherit" size={25} /> : 'Login'}
      </Button>
    );
  }

  const signUpLink = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Link href="#" variant="body2" onClick={() => navigate('/auth/signup', { replace: true })}>
        {'Noch keinen Account?'}
      </Link>
      <Typography sx={{ mt: 1 }}>{`Version ${APP_VERSION}-${version.slice(0, 8)}`}</Typography>
    </div>
  );

  const forgotPasswordLink = () => (
    <Link href="#" variant="body2" onClick={() => navigate('/auth/forgot-password', { replace: true })}>
      Passwort vergessen?
    </Link>
  );

  return (
    <SignInPage
      providers={[{ id: 'credentials', name: 'Credentials' }]}
      signIn={signIn}

      slots={{
        title: Title,
        subtitle: subtitle,
        signUpLink: signUpLink,
        forgotPasswordLink: forgotPasswordLink,
        rememberMe: rememberMe,
        submitButton: submitButton,
      }}
      sx={{
        height: '100%',
        minHeight: '100%',
        verticalAlign: 'middle',
        '& .MuiContainer-root .MuiStack-root': {
          [theme.breakpoints.down('sm')]: {
            border: 'none',
            boxShadow: 'none',
          },
        },
      }}
      slotProps={{
        emailField: { autoFocus: false },
        submitButton: { title: 'Einloggen' },
        rememberMe: { disabled: true, hidden: true },
      }}
    />
  );
};
export default LoginScreen;
