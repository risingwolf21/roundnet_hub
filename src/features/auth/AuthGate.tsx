import {useClient} from "react-supabase";
import {useDispatch, useSelector} from "react-redux";
import {useLocation, useNavigate} from "react-router-dom";
import React, {useCallback, useEffect, useState} from "react";
import {ability, defineRulesFor} from "../../utils/PermissionService";
import {onUserChange} from "../../redux/applicationSlice";
import {AuthChangeEvent, Session} from "@supabase/supabase-js";
import AuthPage from "../../pages/Auth.page";
import {AlertMessage, AlertSnackbar} from "../../components/AlertSnackbar";
import {HOMEPAGE} from "../../constants";
import NotVerifiedScreen from "../../components/NotVerifiedScreen";
import {AuthContext} from "./AuthContext";
import {setUser} from "@sentry/react";
import {RootState} from "../../redux/store";
import {AdminPermissionsRepository} from "../../repository/AdminPermissionsRepository";
import {SupabaseUserRepository} from "../../repository/UserRepository";
import { jwtDecode } from 'jwt-decode'

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

    const handleAuthChange = useCallback(async (event: AuthChangeEvent, session: Session | null) => {

        try {
            if (!session)
                throw Error("Session was null");
            const roles = await AdminPermissionsRepository.fetchRolesForUser(session.user.id);
            const permissions = await AdminPermissionsRepository.fetchPermissionsForRoles(roles);
            const {data: user} = await SupabaseUserRepository.fetchUser(session.user.id);
            console.log(roles,permissions);

            if (!user) {
                throw Error("Fetching user in AuthGate was not successful.");
            }
            setUser({email: session.user.email, id: session.user.id, username: user.displayName});
            ability.update(defineRulesFor(permissions, roles));
            dispatch(onUserChange(user))
            setSession(session);
            if (location.pathname) {
                navigate(location.pathname, {replace: true});
            } else {
                navigate(`/${HOMEPAGE}`, {replace: true});
            }
        } catch (e: any) {
            setSession(null);
            ability.update(defineRulesFor([], []))
            dispatch(onUserChange(null));
            setUser(null)
        }
    }, [dispatch])

    useEffect(() => {
        const {data: {subscription}} = client.auth
            .onAuthStateChange((event, session) => {
                handleAuthChange(event, session);
            });
        return () => subscription.unsubscribe();
    }, [client, handleAuthChange]);

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