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
import Logo from "../images/Karlsruher_Kojoten_Logo.svg";


const RegisterScreen = ({ onRegister, gotoLogin, errorMessage }) => {
    const handleSubmit = (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (data.get('password1') === data.get('password2')) {
            onRegister({
                email: data.get('email'),
                password: data.get('password1'),
                displayName: data.get('username'),
            });
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
                }}>
                <img src={Logo} width={150} />
                <Typography component="h1" variant="h5">
                    Registerierung
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        color='secondary'
                        fullWidth
                        id="email"
                        label="Email Addresse"
                        name="email"
                        autoComplete="email"
                        autoFocus
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        name="username"
                        label="Name"
                        color='secondary'
                    />
                    <TextField
                        margin="normal"
                        required
                        color='secondary'
                        fullWidth
                        name="password1"
                        label="Password"
                        type="password"
                        id="password1"
                    />
                    <TextField
                        margin="normal"
                        required
                        color='secondary'
                        fullWidth
                        name="password2"
                        label="Password"
                        type="password"
                        id="password2"
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
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Registrieren
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
    );
}
export default RegisterScreen;