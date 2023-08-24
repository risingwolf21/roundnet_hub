import AuthScreen from "./components/AuthScreen";
import { setUser } from "@sentry/react";
import React, { createContext, useEffect, useState } from "react";
import { useAuthStateChange } from "./hooks/useAuthStateChange";
import { useClient } from "react-supabase";
import { useDispatch } from "react-redux";
import { onUserChange } from "./redux/applicationReducer";

const initialState = { session: null, user: null }
export const AuthContext = createContext(initialState)

const AuthGate = ({ children }) => {

    const client = useClient();
    const dispatch = useDispatch();
    const [state, setState] = useState(initialState)

    useEffect(() => {
        const session = client.auth.getSession()
        setUser({ email: session?.user?.email ?? null, id: session?.user?.id ?? null });
        setState({ session, user: session?.user ?? null })
    }, [client.auth]);

    useAuthStateChange((event, session) => {
        setUser({ email: session?.user?.email ?? null, id: session?.user?.id ?? null });
        setState({ session, user: session?.user ?? null })
        if (session?.user) {
            client.from("user").select().eq("userId", session.user.id).then(res => {
                if (res && res.data && res.data.length === 1) {
                    let user = {
                        ...session?.user ?? null,
                        role: res.data[0].role,
                    }
                    setState({ user });
                    dispatch(onUserChange(user));
                }
            })
        }
    });

    if (state.user) {
        return <AuthContext.Provider value={state}>
            {children}
        </AuthContext.Provider>
    } else {
        return <AuthScreen />
    }
}
export default AuthGate;