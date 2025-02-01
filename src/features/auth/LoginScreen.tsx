import { useTheme } from '@mui/material';
import Link from '@mui/material/Link';
import { captureException } from '@sentry/react';
import { SignInPage, type AuthProvider } from '@toolpad/core/SignInPage';
import { useNotifications } from '@toolpad/core/useNotifications';
import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertMessage } from '../../components/AlertSnackbar';
import { supabase } from '../../components/services/supabase/supabaseClient';
import raw from '../../git_commit.txt';

type Credentials = {
  email: string;
  password: string;
};

const LoginScreen = () => {
  const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    fetch(raw)
      .then((r) => r.text())
      .then((text) => {
        setVersion(text);
      });
    notifications.show('Die Email des Google-Kontos muss übereinstimmen für eine Verknüpfung mit einem bestehenden Konto. Ansonsten wird ein neues Roundnet Karlsruhe Konto angelegt.', {
      severity: "info"
    });
  }, []);

  const onLogin = (credentials: Credentials) => {
    setAlertInfo(null);
    setLoginInProgress(true);
    supabase.auth
      .signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })
      .then((result) => {
        if (process.env.REACT_APP_ENV === 'production_admin' && result.data.user?.role !== 'admin') {
          throw Error('Cannot login if not user has not the admin role');
        }
        if (result.error) {
          throw result.error;
        } else if (!result.data.session) {
          throw Error('Login failed without any error message. Please try again...');
        } else {
          setAlertInfo(null);
          setLoginInProgress(false);
        }
      })
      .catch((error) => {
        captureException(error);
        setAlertInfo({ message: error.message, severity: 'error' });
        setLoginInProgress(false);
      });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = data.get('email')?.toString();
    const password = data.get('password')?.toString();
    if (email && password) {
      onLogin({ email, password });
    } else {
      setAlertInfo({ message: 'Email or Password is null.', severity: 'error' });
    }
  };

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
              } else {
                setAlertInfo(null);
                setLoginInProgress(false);
              }
            })
            .catch((error) => {
              captureException(error);
              setAlertInfo({ message: error.message, severity: 'error' });
              setLoginInProgress(false);
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
            redirectTo: window.location.origin
          }
        })
          .then((result) => {
            if (process.env.REACT_APP_ENV === 'production_admin') {
              throw Error('Cannot login if not user has not the admin role');
            }
            if (result.error) {
              throw result.error;
            } else if (!result.data) {
              throw Error('Login failed without any error message. Please try again...');
            } else {
              setAlertInfo(null);
              setLoginInProgress(false);
            }
          })
          .catch((error) => {
            captureException(error);
            setAlertInfo({ message: error.message, severity: 'error' });
            setLoginInProgress(false);
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

  const SignUpLink = () => <Link href="#" variant="body2" onClick={() => navigate('/register', { replace: true })}>
    {'Noch keinen Account?'}
  </Link >

  const ForgotPasswordLink = () => <Link href="#" variant="body2" onClick={() => navigate('/forgot-password', { replace: true })}>
    Passwort vergessen?
  </Link>

  const rememberMe = () => <div></div>

  return <SignInPage
    providers={[{ id: 'credentials', name: 'Credentials' }, { id: 'google', name: 'Google' }]}
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
  // return (
  //   <Container component="main" maxWidth="xs">
  //     <CssBaseline />
  //     <Box
  //       sx={{
  //         marginTop: 8,
  //         display: 'flex',
  //         flexDirection: 'column',
  //         alignItems: 'center',
  //       }}
  //     >
  //       <img src={Logo} alt="Logo" width={150} />
  //       <Typography component="h1" variant="h5">
  //         Login
  //       </Typography>
  //       <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
  //         <TextField
  //           margin="normal"
  //           color="secondary"
  //           required
  //           fullWidth
  //           id="email"
  //           label="Email Address"
  //           name="email"
  //           autoComplete="email"
  //         />
  //         <TextField
  //           margin="normal"
  //           color="secondary"
  //           required
  //           fullWidth
  //           name="password"
  //           label="Password"
  //           type="password"
  //           id="password"
  //           autoComplete="current-password"
  //         />
  //         {alertInfo && (
  //           <Alert sx={{ mt: 2 }} severity="error">
  //             {alertInfo.message}
  //           </Alert>
  //         )}
  //         <Button
  //           type="submit"
  //           fullWidth
  //           disabled={loginInProgress}
  //           color="secondary"
  //           variant="contained"
  //           sx={{ mt: 3, mb: 2 }}
  //         >
  //           {loginInProgress ? <CircularProgress /> : 'Einloggen'}
  //         </Button>
  //         <Grid container sx={{ justifyContent: 'space-between' }}>
  //           <Grid>
  //             <Link href="#" variant="body2" onClick={() => navigate('/forgot-password', { replace: true })}>
  //               Passwort vergessen?
  //             </Link>
  //           </Grid>
  //           <Grid>
  //             <Link href="#" variant="body2" onClick={() => navigate('/register', { replace: true })}>
  //               {'Noch keinen Account?'}
  //             </Link>
  //           </Grid>
  //         </Grid>
  //         <Grid container sx={{ position: 'absolute', left: 0, bottom: 0, right: 0, justifyContent: 'center' }}>
  //           <p style={{ color: '#ccc' }}>Version {process.env.REACT_APP_VERSION + '.' + version.slice(0, 6)}</p>
  //         </Grid>
  //       </Box>
  //     </Box>
  //   </Container>
  // );
};
export default LoginScreen;
