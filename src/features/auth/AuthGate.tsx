import {useClient} from "react-supabase";
import {useDispatch, useSelector} from "react-redux";
import {useLocation, useNavigate} from "react-router-dom";
import React, {useEffect, useState} from "react";
import {setUser} from "@sentry/react";
import {ability, defineRulesFor} from "../../utils/PermissionService";
import {onUserChange} from "../../redux/applicationSlice";
import {Session} from "@supabase/supabase-js";
import AuthPage from "../../pages/Auth.page";
import {AlertMessage, AlertSnackbar} from "../../components/AlertSnackbar";
import {HOMEPAGE} from "../../constants";
import NotVerifiedScreen from "../../components/NotVerifiedScreen";
import {RootState} from "../../redux/store";

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
    const {user} = useSelector((state: RootState) => state.application);

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
            .onAuthStateChange(async (_event, session) => {
                try {
                    if (!session)
                        throw Error("Session was null");
                    fetchUser(session.user.id).then(result => {
                        const user = result.data;
                        if (!user || result.error) {
                            throw Error("Fetching user in AuthGate was not successful.");
                        }
                        setUser({email: session.user.email, id: session.user.id, username: user.displayName});
                        ability.update(defineRulesFor(user));
                        dispatch(onUserChange(user));
                        setSession(session);
                        if (location.pathname) {
                            navigate(location.pathname, {replace: true});
                        } else {
                            navigate(`/${HOMEPAGE}`, {replace: true});
                        }
                    })
                } catch (e) {
                    setSession(null);
                    ability.update(defineRulesFor(null))
                    dispatch(onUserChange(null));
                }
            });
        return () => subscription.unsubscribe();
    }, []);

    return <>
        {
            session
                ? user?.verified
                    ? children
                    : <NotVerifiedScreen/>
                : <AuthPage/>
        }
        <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)}/>
    </>
}