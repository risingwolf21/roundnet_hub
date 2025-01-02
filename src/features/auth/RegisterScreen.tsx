import React, { FormEvent, useState } from 'react';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Logo from '../../images/Karlsruher_Kojoten_Logo.svg';
import { supabase } from '../../components/services/supabase/supabaseClient';
import { captureException } from '@sentry/react';
import { RegistrationError } from '../../utils';
import { AlertMessage, AlertSnackbar } from '../../components/AlertSnackbar';
import { useNavigate } from 'react-router-dom';

export type RegisterProps = {
  email: string;
  password: string;
  displayName: string;
};

const RegisterScreen = () => {
  const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
  const navigate = useNavigate();

  const onRegister = async ({ email, password, displayName }: RegisterProps) => {
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          displayName,
          email,
          role: 'user',
        },
      },
    });

    if (error) {
      captureException(new RegistrationError('Could not sign up user.'), (scope) => {
        scope.clear();
        scope.setExtra('displayName', displayName);
        scope.setExtra('email', email);
        scope.setExtra('error', JSON.stringify(error));
        return scope;
      });
      setAlertInfo({ message: 'Could not sign up user. [' + error?.message + ']', severity: 'error' });
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = data.get('email')?.toString();
    const password = data.get('password1')?.toString();
    const password2 = data.get('password2')?.toString();
    const name = data.get('name')?.toString();
    const surname = data.get('surname')?.toString();

    if (!password || !password2 || password !== password2) {
      setAlertInfo({ message: 'Die Passwörter stimmen nicht überein.', severity: 'error' });
    } else if (!email || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      setAlertInfo({ message: 'Die angegebene Email-Adresse ist nicht korrekt.', severity: 'error' });
    } else if (!name || !surname || name.length < 2 || surname.length < 2) {
      setAlertInfo({ message: 'Bitte gib deinen Vor-und Nachnamen an.', severity: 'error' });
    } else {
      onRegister({ email, password, displayName: name.trim() + ' ' + surname.trim() });
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
          Registerierung
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            color="secondary"
            fullWidth
            id="email"
            label="Email Addresse"
            name="email"
            autoComplete="email"
          />
          <TextField margin="normal" required fullWidth id="name" name="name" label="Vorname" color="secondary" />
          <TextField
            margin="normal"
            required
            fullWidth
            id="surname"
            name="surname"
            label="Nachname"
            color="secondary"
          />
          <TextField
            margin="normal"
            required
            color="secondary"
            fullWidth
            name="password1"
            label="Password"
            type="password"
            id="password1"
          />
          <TextField
            margin="normal"
            required
            color="secondary"
            fullWidth
            name="password2"
            label="Password"
            type="password"
            id="password2"
          />
          <Button type="submit" fullWidth color="secondary" variant="contained" sx={{ mt: 3, mb: 2 }}>
            Registrieren
          </Button>
          <Grid container>
            <Grid>
              <Link href="#" variant="body2" onClick={() => navigate('/login', { replace: true })}>
                Already have an account? Sign in here!
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
      <AlertSnackbar alertInfo={alertInfo} />
    </Container>
  );
};
export default RegisterScreen;
