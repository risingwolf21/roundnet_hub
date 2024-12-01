import {useClient} from "react-supabase";
import {useDispatch, useSelector} from "react-redux";
import {useLocation, useNavigate} from "react-router-dom";
import React, {useEffect, useState} from "react";
import {ability, defineRulesFor} from "../../utils/PermissionService";
import {onUserChange} from "../../redux/applicationSlice";
import {Session} from "@supabase/supabase-js";
import AuthPage from "../../pages/Auth.page";
import {AlertMessage, AlertSnackbar} from "../../components/AlertSnackbar";
import {HOMEPAGE} from "../../constants";
import NotVerifiedScreen from "../../components/NotVerifiedScreen";
import {AuthContext} from "./AuthContext";
import {setUser} from "@sentry/react";
import {RootState} from "../../redux/store";
import {UserWithRoles} from "../../types/supabaseTypes";
import {allAppPermissions} from "../../utils";

type Props = {
    children: React.ReactNode
}

export const AuthGate = ({children}: Props) => {
    const client = useClient();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const currentUser = useSelector((state: RootState) => state.application.user)
    const [session, setSession] = useState<Session | null>(null);
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

    useEffect(() => {

        const fetchUser = (userId: string) => client
            .from("user")
            .select("*, roles: user_roles ( role, permissions: role_permissions(*))")
            .eq("userId", userId)
            .returns<UserWithRoles>()
            .single<UserWithRoles>()
            .throwOnError();

        client.auth.getSession().then(({data: {session}}) => {
            setSession(session);
        });
        const {data: {subscription}} = client.auth
            .onAuthStateChange(async (event, session) => {
                try {
                    if (!session)
                        throw Error("Session was null");
                    fetchUser(session.user.id).then(result => {
                        const user = result.data;
                        if (!user || result.error) {
                            throw Error("Fetching user in AuthGate was not successful.");
                        }
                        setUser({email: session.user.email, id: session.user.id, username: user.displayName});
                        ability.update(defineRulesFor(allAppPermissions));
                        dispatch(onUserChange(user))
                        setSession(session);
                        if (location.pathname) {
                            navigate(location.pathname, {replace: true});
                        } else {
                            navigate(`/${HOMEPAGE}`, {replace: true});
                        }
                    })
                } catch (e) {
                    setSession(null);
                    ability.update(defineRulesFor([]))
                    dispatch(onUserChange(null));
                    setUser(null)
                }
            });
        return () => subscription.unsubscribe();
    }, [client, dispatch, location.pathname, navigate]);

    return <>
        {
            session
                ? currentUser && currentUser.verified
                    ? <AuthContext.Provider value={currentUser}>
                        {children}
                    </AuthContext.Provider>
                    : <NotVerifiedScreen/>
                : <AuthPage/>
        }
        <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)}/>
    </>
}