import { useSelector } from "react-redux";
import { isEmpty, isLoaded } from "react-redux-firebase";
import AuthScreen from "./components/AuthScreen";
import { CircularProgress, Grid, Toolbar } from "@mui/material";
import CustomAppBar from "./components/AppBar";
import { setUser } from "@sentry/react";
import { useEffect } from "react";

const AuthGate = ({ children }) => {
    const auth = useSelector(state => state.firebase.auth)

    useEffect(() => {
        if (!isLoaded(auth))
            return;
        if (isEmpty(auth))
            setUser(null);
        else
            setUser({ email: auth.email, id: auth.uid, username: auth.displayName });
    }, [auth]);

    if (!isLoaded(auth)) {
        return <Grid>
            <CustomAppBar logout={() => { }} drawerOpen={false} handleMenuClick={() => { }} />
            <Toolbar />
            <Grid
                container
                spacing={0}
                direction="column"
                alignItems="center"
                justifyContent="center"
                style={{ minHeight: '100vh' }}>
                <CircularProgress />
            </Grid>
        </Grid>
    } else if (!isEmpty(auth)) {
        return children;
    } else {
        return <AuthScreen />
    }
}

export default AuthGate;