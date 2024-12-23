import * as React from 'react';
import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { supabase } from '../../components/services/supabase/supabaseClient';
import Logo from '../../images/Karlsruher_Kojoten_Logo.svg';
import { Alert, Snackbar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CustomAppBar from '../../components/AppBar';
import { HOMEPAGE } from '../../constants';

const ResetPasswordScreen = () => {
  const [errorMessage, setErrorMessage] = React.useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [successMessageOpen, setSuccessMessageOpen] = React.useState(false);

  const navigate = useNavigate();

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
    const data = new FormData(event.currentTarget);
    const password = data.get('password')?.toString();
    const password1 = data.get('password1')?.toString();

    if (password !== password1 || !password || !password1) {
      setErrorMessage('Die Passwörter stimmen nicht überein!');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) setErrorMessage(error.message);
    else {
      setSuccessMessageOpen(true);
      await new Promise((r) => setTimeout(r, 2000));
      navigate(`/${HOMEPAGE}`, { replace: true });
    }
  };

  return (
    <Box>
      <CustomAppBar navigateBack />
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
            Passwort zurücksetzen
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              color="secondary"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
            />
            <TextField
              margin="normal"
              color="secondary"
              required
              fullWidth
              name="password1"
              label="Password wiederholen"
              type="password"
              id="password1"
            />
            {errorMessage && <Typography color="error">{errorMessage}</Typography>}
            <Button type="submit" fullWidth color="secondary" variant="contained" sx={{ mt: 3, mb: 2 }}>
              Passwort ändern
            </Button>
            <Snackbar
              sx={{ position: 'absolute', right: '16px', bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
              open={successMessageOpen}
              onClose={() => setSuccessMessageOpen(false)}
            >
              <Alert onClose={() => setSuccessMessageOpen(false)} severity={'success'} sx={{ width: '100%' }}>
                Passwort erfolgreich geändert!
              </Alert>
            </Snackbar>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};
export default ResetPasswordScreen;
