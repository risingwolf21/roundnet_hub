import { Alert, CircularProgress } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import Grid from '@mui/material/Grid2';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { captureException } from '@sentry/react';
import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertMessage } from '../../components/AlertSnackbar';
import { supabase } from '../../components/services/supabase/supabaseClient';
import Logo from '../../images/Karlsruher_Kojoten_Logo.svg';

type Credentials = {
  email: string;
  password: string;
};

const LoginScreen = () => {
  const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
  const [loginInProgress, setLoginInProgress] = useState(false);

  const navigate = useNavigate();

  const onLogin = (credentials: Credentials) => {
    setAlertInfo(null);
    setLoginInProgress(true);
    supabase.auth
      .signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })
      .then((result) => {
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

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <img src={Logo} alt="Logo" width={150} />
        <Typography component="h1" variant="h5">
          Login
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            color="secondary"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
          />
          <TextField
            margin="normal"
            color="secondary"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
          />
          {alertInfo && (
            <Alert sx={{ mt: 2 }} severity="error">
              {alertInfo.message}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            disabled={loginInProgress}
            color="secondary"
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            {loginInProgress ? <CircularProgress /> : 'Einloggen'}
          </Button>
          <Grid container sx={{ justifyContent: 'space-between' }}>
            <Grid>
              <Link href="#" variant="body2" onClick={() => navigate('/forgot-password', { replace: true })}>
                Passwort vergessen?
              </Link>
            </Grid>
            <Grid>
              <Link href="#" variant="body2" onClick={() => navigate('/register', { replace: true })}>
                {'Noch keinen Account?'}
              </Link>
            </Grid>
          </Grid>
          <Grid container sx={{ position: 'absolute', left: 0, bottom: 0, right: 0, justifyContent: 'center' }}>
            <p style={{ color: '#ccc' }}>Version {process.env.REACT_APP_VERSION}</p>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};
export default LoginScreen;
