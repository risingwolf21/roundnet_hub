import React, {FormEvent, useState} from "react"
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
import {TABLE_USER} from "../constants";
import {AuthViewType} from "./AuthScreen";
import {CircularProgress} from "@mui/material";
import {AlertMessage, AlertSnackbar} from "./AlertSnackbar";

type Credentials = {
    email: string,
    password: string
}

type LoginProps = {
    setAuthView: (view: AuthViewType) => void
}

const LoginScreen = ({setAuthView}: LoginProps) => {

    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
    const [loginInProgress, setLoginInProgress] = useState(false);

    const onLogin = async (credentials: Credentials) => {
        setAlertInfo(null);
        setLoginInProgress(true)
        const {data, error} = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
        });
        if (error) {
            setAlertInfo({message: error.message, severity: "error"});
            setLoginInProgress(false);
        } else
            supabase.from(TABLE_USER).select().eq("userId", data.user.id).then(async res => {
                if (res.data && res.data.length === 1) {
                    await supabase.auth.updateUser({
                        data: {role: res.data[0].role}
                    });
                }
                setAlertInfo(null);
                setLoginInProgress(false);
            })
    }

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = data.get("email")?.toString();
        const password = data.get("password")?.toString();
        if (email && password) {
            onLogin({email, password});
        } else {
            setAlertInfo({message: "Email or Password is null.", severity: "error"})
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
                <img src={Logo} alt='Logo' width={150}/>
                <Typography component="h1" variant="h5">
                    Login
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{mt: 1}}>
                    <TextField
                        margin="normal"
                        color='secondary'
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                    />
                    <TextField
                        margin="normal"
                        color='secondary'
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                    />
                    <Button
                        type="submit"
                        fullWidth
                        disabled={loginInProgress}
                        color='secondary'
                        variant="contained"
                        sx={{mt: 3, mb: 2}}
                    >
                        {
                            loginInProgress ? <CircularProgress/> : "Einloggen"
                        }
                    </Button>
                    <Grid container>
                        <Grid item xs>
                            <Link href="#" variant="body2" onClick={() => setAuthView('forgotten_password')}>
                                Passwort vergessen?
                            </Link>
                        </Grid>
                        <Grid item>
                            <Link href="#" variant="body2" onClick={() => setAuthView('sign_up')}>
                                {"Noch keinen Account?"}
                            </Link>
                        </Grid>
                    </Grid>
                    <Grid container sx={{position: "absolute", left: 0, bottom: 0, right: 0, justifyContent: "center"}}>
                        <p style={{color: "#ccc"}}>Version {process.env.REACT_APP_VERSION}</p>
                    </Grid>
                </Box>
            </Box>
            <AlertSnackbar alertInfo={alertInfo}/>
        </Container>
    );
}
export default LoginScreen;