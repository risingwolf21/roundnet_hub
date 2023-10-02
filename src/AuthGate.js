import AuthScreen from "./components/AuthScreen";
import { setUser } from "@sentry/react";
import React, { createContext, useState } from "react";
import { useAuthStateChange } from "./hooks/useAuthStateChange";
import { useClient } from "react-supabase";
import { useDispatch } from "react-redux";
import { onUserChange } from "./redux/applicationSlice";
import { useNavigate } from "react-router-dom";
import LoginScreen from './components/LoginScreen';
import ForgotPasswordScreen from './components/ForgotPasswordScreen';
import RegisterScreen from './components/RegisterScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import { Route, Routes } from 'react-router-dom';


const initialState = { session: null, user: null }
export const AuthContext = createContext(initialState)

const AuthGate = ({ children }) => {

    const client = useClient();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [state, setState] = useState(initialState);

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
        } else {
            setState(null);
            dispatch(onUserChange(null));
            navigate("/login", { replace: true });
        }
    });

    if (!state?.user) {
        return <Routes>
            <Route path='/login' element={<LoginScreen />} />
            <Route path='/register' element={<RegisterScreen />} />
            <Route path='/forgot-password' element={<ForgotPasswordScreen />} />
        </Routes>
    }

    return <AuthContext.Provider value={state}>
        {children}
    </AuthContext.Provider>
}
export default AuthGate;