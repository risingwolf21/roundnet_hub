import React, {FormEvent, useState} from "react";
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Logo from "../images/Karlsruher_Kojoten_Logo.svg";
import {supabase} from "./services/supabase/supabaseClient";
import {captureException} from "@sentry/react";
import {RegistrationError} from "../utils";
import {AuthViewType} from "./AuthScreen";

type RegisterProps = {
    email: string,
    password: string,
    displayName: string
}

type RegisterScreenProps = {
    setAuthView: (view: AuthViewType) => void
}

const RegisterScreen = ({setAuthView}: RegisterScreenProps) => {

    const [errorMessage, setErrorMessage] = useState("");

    const onRegister = async ({email, password, displayName}: RegisterProps) => {
        const {error} = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    displayName,
                    email,
                    role: "user",
                }
            }
        });

        if (error) {
            captureException(new RegistrationError("Could not sign up user."), (scope) => {
                scope.clear();
                scope.setExtra("displayName", displayName);
                scope.setExtra("email", email);
                scope.setExtra("error", JSON.stringify(error));
                return scope;
            })
            setErrorMessage("Could not sign up user. [" + error?.message + "]");
        }
    }

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = data.get('email')?.toString();
        const password = data.get('password1')?.toString();
        const password2 = data.get('password2')?.toString();
        const name = data.get('name')?.toString();
        const surname = data.get('surname')?.toString();

        if (!password || !password2 || (password !== password2)) {
            setErrorMessage("Die Passwörter stimmen nicht überein.")
        } else if (!email || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
            setErrorMessage("Die angegebene Email-Adresse ist nicht korrekt.")
        } else if (!name || !surname || name.length < 2 || surname.length < 2) {
            setErrorMessage("Bitte gib deinen Vor-und Nachnamen an.")
        } else {
            onRegister({email, password, displayName: name.trim() + " " + surname.trim()})
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline/>
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}>
                <img src={Logo} alt="Logo" width={150}/>
                <Typography component="h1" variant="h5">
                    Registerierung
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{mt: 1}}>
                    <TextField
                        margin="normal"
                        required
                        color='secondary'
                        fullWidth
                        id="email"
                        label="Email Addresse"
                        name="email"
                        autoComplete="email"
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="name"
                        name="name"
                        label="Vorname"
                        color='secondary'
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="surname"
                        name="surname"
                        label="Nachname"
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
                        sx={{mt: 3, mb: 2}}
                    >
                        Registrieren
                    </Button>
                    <Grid container>
                        <Grid item xs>
                            <Link href="#" variant="body2" onClick={() => setAuthView('sign_in')}>
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