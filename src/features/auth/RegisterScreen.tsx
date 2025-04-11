import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import Grid from '@mui/material/Grid2';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { captureException } from '@sentry/react';
import { useNotifications } from '@toolpad/core/useNotifications';
import React, { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import Layout from 'src/components/Layout';
import { supabase } from '../../components/services/supabase/supabaseClient';
import Logo from '../../images/Karlsruher_Kojoten_Logo.svg';
import { RegistrationError } from '../../utils';

export type RegisterProps = {
  email: string;
  password: string;
  name: string;
};

const RegisterScreen = () => {
  const navigate = useNavigate();
  const notifications = useNotifications();

  const onRegister = async ({ email, password, name }: RegisterProps) => {
    const { error, data } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name,
          displayName: name,
          email,
          role: 'user',
        },
      },
    });

    if (error || !data || !data.user) {
      captureException(new RegistrationError('Could not sign up user.'), (scope) => {
        scope.clear();
        scope.setExtra('displayName', name);
        scope.setExtra('email', email);
        scope.setExtra('error', JSON.stringify(error));
        return scope;
      });
      notifications.show('Could not sign up user. [' + error?.message + ']', { severity: 'error' })
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
      notifications.show('Die Passwörter stimmen nicht überein.', { severity: 'error' })
    } else if (!email || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      notifications.show('Die angegebene Email-Adresse ist nicht korrekt.', { severity: 'error' })
    } else if (!name || !surname || name.length < 2 || surname.length < 2) {
      notifications.show('Bitte gib deinen Vor-und Nachnamen an.', { severity: 'error' })
    } else {
      onRegister({ email, password, name: name.trim() + ' ' + surname.trim() });
    }
  };

  return (
    <Layout appBarConfig={{ showProfile: false }}>
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
      </Container>
    </Layout>
  );
};
export default RegisterScreen;
