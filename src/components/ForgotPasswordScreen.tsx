import * as React from 'react';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
//@ts-ignore
import { supabase } from '../supabaseClient';
//@ts-ignore
import Logo from "../images/Karlsruher_Kojoten_Logo.svg";
import { Alert, CircularProgress, Snackbar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const ForgotPasswordScreen = () => {

    const [errorMessage, setErrorMessage] = React.useState("");
    const [loading, setLoading] = useState(false);
    const [successMessageOpen, setSuccessMessageOpen] = React.useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        setLoading(true);
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        if (!data.get("email"))
            return;

        const { error } = await supabase.auth.resetPasswordForEmail(data.get("email")?.toString() ?? "", {
            redirectTo: window.location.origin + "/reset-password"
        });
        setLoading(false);
        if (error)
            setErrorMessage(error.message);
        else
            setSuccessMessageOpen(true)
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
                }}>
                <img src={Logo} alt='Logo' width={150} />
                <Typography component="h1" variant="h5">
                    Passwort zurücksetzen
                </Typography>
                <Box component="form" onSubmit={(e) => handleSubmit(e)} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        color='secondary'
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                    />
                    {
                        errorMessage && <Typography color="red">
                            {errorMessage}
                        </Typography>
                    }
                    <Button
                        type="submit"
                        fullWidth
                        color='secondary'
                        variant="contained"
                        disabled={loading}
                        sx={{ mt: 3, mb: 2 }}>
                        {
                            loading ? <CircularProgress /> : "Abschicken"
                        }
                    </Button>
                    <Snackbar sx={{ position: "absolute", right: "16px", bottom: "16px" }} open={successMessageOpen} onClose={() => setSuccessMessageOpen(false)}>
                        <Alert onClose={() => setSuccessMessageOpen(false)} severity={"success"} sx={{ width: '100%' }}>
                            Link zum zurücksetzen des Passworts gesendet
                        </Alert>
                    </Snackbar>
                    <Grid container>
                        <Grid item xs>
                            <Link href="#" variant="body2" onClick={() => navigate("/login")}>
                                Hier einloggen
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Container>
    );
}
export default ForgotPasswordScreen;