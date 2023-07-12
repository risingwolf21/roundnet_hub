import { connect, useSelector } from "react-redux";
import { isEmpty, isLoaded } from "react-redux-firebase";
import AuthScreen from "./components/AuthScreen";
import { CircularProgress, Grid, Toolbar } from "@mui/material";
import CustomAppBar from "./components/AppBar";
import { setUser, withProfiler } from "@sentry/react";
import { supabase } from "./supabaseClient";
import { compose } from "recompose";
import React from "react";
import { authentication_changed } from "./redux/actions";

const AuthGate = ({ children, user, dispatch }) => {
    const auth = useSelector(state => state.firebase.auth)

    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            dispatch(authentication_changed(session?.user));
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            dispatch(authentication_changed(session?.user));
            if (!session || !session.user)
                setUser(null);
            else
                setUser({ email: session.user.email, id: session.user.id })
        });
    }, []);

    if (false) {
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
    } else if (user) {
        return children;
    } else {
        return <AuthScreen />
    }
}
export default compose(connect((state) => ({
    user: state.application.user
})))(AuthGate);