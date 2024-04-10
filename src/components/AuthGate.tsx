import {useClient} from "react-supabase";
import {useDispatch} from "react-redux";
import {useLocation, useNavigate} from "react-router-dom";
import React, {useEffect, useState} from "react";
import {setUser} from "@sentry/react";
import {User} from "../types/supabaseTypes";
import {ability, defineRulesFor} from "../utils/PermissionService";
import {onUserChange} from "../redux/applicationSlice";
import {Session} from "@supabase/supabase-js";
import AuthScreen from "./AuthScreen";
import {AlertMessage, AlertSnackbar} from "./AlertSnackbar";
import {HOMEPAGE} from "../constants";

type Props = {
    children: string | JSX.Element | JSX.Element[]
}

export const AuthGate = ({children}: Props) => {
    const client = useClient();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const [session, setSession] = useState<Session | null>(null);
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

    const fetchUser = (userId: string) => client
        .from("user")
        .select("*")
        .eq("userId", userId)
        .returns<User>()
        .single<User>()
        .throwOnError();

    useEffect(() => {
        client.auth.getSession().then(({data: {session}}) => {
            setSession(session);
        });
        const {data: {subscription}} = client.auth
            .onAuthStateChange((_event, session) => {
                if (session) {
                    fetchUser(session.user.id)
                        .then((result) => {
                            const user = result.data;
                            if (!user || result.error) {
                                setAlertInfo({
                                    message: "Fetching user in AuthGate was not successful. " + JSON.stringify(result.error),
                                    severity: "error"
                                });
                                return;
                            }
                            setUser({email: session.user.email, id: session.user.id, username: user.displayName});
                            ability.update(defineRulesFor(user));
                            dispatch(onUserChange(user));
                            setSession(session);
                            if (!user.verified)
                                return;
                            if (location.state && location.state.from) {
                                navigate(location.state.from, {replace: true});
                            } else {
                                navigate(`/${HOMEPAGE}`, {replace: true});
                            }
                        });
                } else {
                    setSession(null);
                    ability.update(defineRulesFor(null))
                    dispatch(onUserChange(null));
                }
            });
        return () => subscription.unsubscribe();
    }, []);

    return <>
        {
            session ? children : <AuthScreen/>
        }
        <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)}/>
    </>
}