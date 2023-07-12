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
    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session || !session.user) {
                dispatch(authentication_changed(session?.user))
                return;
            }
            supabase
                .from('users')
                .select("*")
                .eq("userId", session.user.id)
                .then((res) => {
                    if (res.data.length == 1) {
                        dispatch(authentication_changed({ ...session?.user, userId: res.data[0].id, role: res.data[0].role }))
                    }
                });


            supabase
                .channel('any')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `userId=eq.${session.user.id}` }, payload => {
                    dispatch(authentication_changed({ ...session?.user, userId: payload.new.id, role: payload.new.role }))
                })
                .subscribe();
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            supabase
                .from('users')
                .select("*")
                .eq("userId", session?.user?.id)
                .then((res) => {
                    if (res.data.length == 1 && session && session.user) {
                        dispatch(authentication_changed({ ...session?.user, userId: res.data[0].id, role: res.data[0].role }))
                    }
                })
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