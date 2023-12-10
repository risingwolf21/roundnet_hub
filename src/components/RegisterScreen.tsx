import React, { FormEvent, useState } from "react";
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Logo from "../images/Karlsruher_Kojoten_Logo.svg";
import { supabase } from "./services/supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { TABLE_USER } from "../constants";
import { captureException } from "@sentry/react";
import { RegistrationError } from "../utils";

type RegisterProps = {
    email: string,
    password: string,
    displayName: string
}

const RegisterScreen = () => {

    const [errorMessage, setErrorMessage] = useState("");
    const navigate = useNavigate();

    const onRegister = async ({ email, password, displayName }: RegisterProps) => {
        const { data, error } = await supabase.auth.signUp({
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

        if (!data.user || error) {
            captureException(new RegistrationError("Could not sign up user. The result was empty!"), (scope) => {
                scope.clear();
                scope.setExtra("displayName", displayName);
                scope.setExtra("email", email);
                return scope;
            })
            setErrorMessage("Could not sign up user. The result was empty! [" + error?.message + "]");
            return;
        }

        let { error: updatingUserError } = await supabase.auth.updateUser({ data: { userId: data.user.id } })
        let { error: writingError } = await supabase.from(TABLE_USER).upsert({ email, displayName, userId: data.user.id, role: "user" })

        if (error)
            setErrorMessage(JSON.stringify(error));
        if (updatingUserError)
            setErrorMessage(JSON.stringify(updatingUserError));
        if (writingError)
            setErrorMessage(JSON.stringify(writingError));

        if (error || updatingUserError || writingError) {
            captureException(new RegistrationError(""), (scope) => {
                scope.clear();
                scope.setExtra("signUpError", JSON.stringify(error))
                scope.setExtra("updatingUserError", JSON.stringify(updatingUserError))
                scope.setExtra("writingError", JSON.stringify(writingError))
                return scope;
            })
        }

        navigate("/drinks", { replace: true });
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
        } else if (!email || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
            setErrorMessage("Die angegebene Email-Adresse ist nicht korrekt.")
        } else if (!name || !surname || name.length < 2 || surname.length < 2) {
            setErrorMessage("Bitte gib deinen Vor-und Nachnamen an.")
        } else {
            onRegister({ email, password, displayName: name.trim() + " " + surname.trim() })
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
                <img src={Logo} alt="Logo" width={150} />
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
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Registrieren
                    </Button>
                    <Grid container>
                        <Grid item xs>
                            <Link href="#" variant="body2" onClick={() => navigate("/login")}>
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