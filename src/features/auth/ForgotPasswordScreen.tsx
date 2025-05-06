import { alpha, CircularProgress, Stack, useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useNotifications } from '@toolpad/core/useNotifications';
import * as React from 'react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { HOMEPAGE } from 'src/constants';
import { BRANDING } from 'src/utils';
import { useApplication } from './ApplicationContext';
import { getCommonTextFieldProps } from './SignUpScreen';
import Layout from 'src/components/Layout';

const ForgotPasswordScreen = () => {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const { version, user } = useApplication();
  const location = useLocation();

  if (user) {
    return <Navigate to={location.state?.path !== "/login" ? location.state?.path || HOMEPAGE : HOMEPAGE} />
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email')?.toString();

    const { data, error } = await supabase.from("user").select("userId").eq("role", "admin");
    if (error || !data) {
      notifications.show(
        "Fehler beim Senden der Anfrage: " + error.message, { severity: "error" }
      );
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("notifications").insert(data.map(x => ({
      user: x.userId,
      title: "Password reset request",
      body: `${email} wants to reset his password.`
    })))

    if (insertError) {
      notifications.show(
        "Fehler beim Senden der Anfrage: " + insertError.message, { severity: "error" }
      );
      setLoading(false);
      return;
    }

    notifications.show("Anfrage erfolgreich versendet!", { severity: "success" })
  };

  return <Layout appBarConfig={{ showProfile: false }}>
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
            Passwort zurücksetzen
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ width: "100%" }}
          >
            <Stack direction={"column"} spacing={2} sx={{ mb: 2, mt: 2 }}>
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
            </Stack>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ my: 2 }}
            >
              {
                loading ? <CircularProgress color="inherit" size={25} /> : "Abschicken"
              }
            </Button>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Link href="#" variant="body2" onClick={() => navigate('/login', { replace: true })}>
                Hier einloggen
              </Link>
              <Typography sx={{ mt: 1 }}>{`Version ${process.env.REACT_APP_VERSION}-${version.slice(0, 8)}`}</Typography>
            </div>
          </Box>
        </Box>
      </Container>
    </Box>
  </Layout>
};
export default ForgotPasswordScreen;
