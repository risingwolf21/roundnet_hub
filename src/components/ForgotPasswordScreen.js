import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { supabase } from '../supabaseClient';
import ResetPassword from './ResetPassword';
import Logo from "../images/Karlsruher_Kojoten_Logo.svg";
import { Alert, Snackbar } from '@mui/material';

const theme = createTheme();

const ForgotPasswordScreen = ({ gotoLogin }) => {

    const [errorMessage, setErrorMessage] = React.useState("");
    const [inputNewPassword, setInputNewPassword] = React.useState(false);
    const [successMessageOpen, setSuccessMessageOpen] = React.useState(false);

    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
            console.log(event)
            setInputNewPassword(true);
        }
    });

    const updatePassword = async (password) => {
        const { data, error } = await supabase.auth
            .updateUser({ password: password })

        if (data)
            setInputNewPassword(false);
        if (error)
            alert("There was an error updating your password.")
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (!data.get("email"))
            return
        const { error } = await supabase.auth.resetPasswordForEmail(data.get("email"));
        if (error)
            setErrorMessage(error);
        else
            setSuccessMessageOpen(true)
    };

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSuccessMessageOpen(false);
    };

    if (inputNewPassword)
        return <ResetPassword resetPassword={updatePassword} />

    return (
        <ThemeProvider theme={theme}>
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
                        Passowort vergessen?
                    </Typography>
                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                        <Typography component="h1" variant="h5" textAlign="center">
                            Bitte melde dich bei deinem Administrator
                        </Typography>
                        <Grid container textAlign={"center"}>
                            <Grid item xs>
                                <Link href="#" variant="body2" onClick={() => gotoLogin()}>
                                    Already have an account? Sign in here!
                                </Link>
                            </Grid>
                        </Grid>
                    </Box>
                </Box>
                <Snackbar sx={{ position: "fixed", right: "16px", bottom: "16px" }} open={successMessageOpen} autoHideDuration={1500} onClose={handleClose}>
                    <Alert onClose={handleClose} severity={"success"} sx={{ width: '100%' }}>
                        Passwort zurücksetzen erfolgreich angefragt. Bitt überprüfe deine Emails
                    </Alert>
                </Snackbar>
            </Container>
        </ThemeProvider>
    );
}
export default ForgotPasswordScreen;