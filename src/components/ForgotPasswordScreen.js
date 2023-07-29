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

const theme = createTheme();

const ForgotPasswordScreen = ({ gotoLogin }) => {

    const [errorMessage, setErrorMessage] = React.useState("");
    const [inputNewPassword, setInputNewPassword] = React.useState(false);

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
        if (error) setErrorMessage(error);
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
                    <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                        <LockOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Forgot password
                    </Typography>
                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            autoFocus />
                        {
                            errorMessage && <Typography color="red">
                                {errorMessage}
                            </Typography>
                        }
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}>
                            Submit
                        </Button>
                        <Grid container>
                            <Grid item xs>
                                <Link href="#" variant="body2" onClick={() => gotoLogin()}>
                                    Already have an account? Sign in here!
                                </Link>
                            </Grid>
                        </Grid>
                    </Box>
                </Box>
            </Container>
        </ThemeProvider>
    );
}
export default ForgotPasswordScreen;