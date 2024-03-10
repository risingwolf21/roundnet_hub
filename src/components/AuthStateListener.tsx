import {useClient} from "react-supabase";
import {useDispatch} from "react-redux";
import {useLocation, useNavigate} from "react-router-dom";
import {useEffect} from "react";
import {setUser} from "@sentry/react";
import {TABLE_USER} from "../constants";
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
        const {data} = client.auth.onAuthStateChange((event, session) => {
            setUser({email: session?.user?.email, id: session?.user?.id});
            if (session && session.user) {
                client.from(TABLE_USER).select().eq("userId", session.user.id).single().then((res) => {
                    if (res && res.data) {
                        let user = {
                            userId: session.user.id,
                            email: session.user.email,
                            displayName: session.user.user_metadata.displayName,
                            role: res.data.role,
                            verified: res.data.verified,
                            avatarUrl: res.data.avatarUrl,
                            permissions: res.data.permissions ?? [],
                            notifications: res.data.notifications ?? []
                        } as User;
                        ability.update(defineRulesFor(user))
                        dispatch(onUserChange(user));
                        if(!user.verified)
                            return;
                        if (location.state && location.state.from) {
                            navigate(location.state.from, {replace: true});
                        }
                    }
                })
            } else {
                ability.update(defineRulesFor(null))

                dispatch(onUserChange(null));
                navigate("/auth", {replace: true});
            }
        })
        return () => {
            data.subscription.unsubscribe();
        }
    }, [client, dispatch, navigate]);

    return children;
}