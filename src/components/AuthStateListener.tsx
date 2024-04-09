import {useClient} from "react-supabase";
import {useDispatch} from "react-redux";
import {useLocation, useNavigate} from "react-router-dom";
import {useEffect} from "react";
import {setUser} from "@sentry/react";
import {User} from "../types/supabaseTypes";
import {ability, defineRulesFor} from "../utils/PermissionService";
import {onUserChange} from "../redux/applicationSlice";

type Props = {
    children: string | JSX.Element | JSX.Element[]
}

export const AuthStateListener = ({children}: Props) => {
    const client = useClient();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state?.from.pathname === "/auth")
            return;
        const {data: {subscription}} = client.auth.onAuthStateChange((event, session) => {
            if (session && session.user) {
                client.from("user")
                    .select("*")
                    .eq("userId", session.user.id)
                    .returns<User>()
                    .single<User>()
                    .then((result) => {
                        if (!result.data) {
                            return;
                        }
                        const user = result.data;
                        setUser({email: session.user.email, id: session.user.id, username: user.displayName});
                        ability.update(defineRulesFor(user))
                        dispatch(onUserChange(user));
                        if (!user.verified)
                            return;
                        if (location.state && location.state.from) {
                            navigate(location.state.from, {replace: true});
                        }
                    })
            } else {
                ability.update(defineRulesFor(null))

                dispatch(onUserChange(null));
                navigate("/auth", {replace: true});
            }
        })
        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch, navigate]);

    return children;
}