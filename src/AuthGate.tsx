import { setUser } from "@sentry/react";
import React, { createContext, useEffect } from "react";
import { useClient } from "react-supabase";
import { useDispatch, useSelector } from "react-redux";
import { onUserChange } from "./redux/applicationSlice";
import { Navigate, useNavigate } from "react-router-dom";
import LoginScreen from './components/LoginScreen';
import ForgotPasswordScreen from './components/ForgotPasswordScreen';
import RegisterScreen from './components/RegisterScreen';
import { Route, Routes } from 'react-router-dom';
import NotVerifiedScreen from "./components/NotVerifiedScreen";
import { RootState } from "./redux/store";
import { User } from "./types/supabaseTypes";
import { TABLE_USER } from "./constants";


const initialState = { session: null, user: null }
export const AuthContext = createContext(initialState)

type Props = {
    children: string | JSX.Element | JSX.Element[]
}

const AuthGate = ({ children }: Props) => {

    const { user } = useSelector((state: RootState) => state.application);

    const client = useClient();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        client.auth.onAuthStateChange((event, session) => {
            setUser({ email: session?.user?.email, id: session?.user?.id });
            if (session && session.user) {
                client.from(TABLE_USER).select().eq("userId", session.user.id).single().then((res) => {
                    if (res && res.data) {
                        let user = {
                            userId: session.user.id,
                            email: session.user.email,
                            displayName: session.user.user_metadata.displayName,
                            role: res.data.role,
                            verified: res.data.verified
                        } as User;
                        dispatch(onUserChange(user));
                    }
                })
            } else {
                dispatch(onUserChange(null));
                navigate("/login", { replace: true });
            }
        })
    }, [client, dispatch, navigate]);

    const authenticationRoutes = [
        <Route path='/login' element={<LoginScreen />} />,
        <Route path='/register' element={<RegisterScreen />} />,
        <Route path='/forgot-password' element={<ForgotPasswordScreen />} />
    ];

    if (!user) {
        return <Routes>
            {
                authenticationRoutes
            }
        </Routes>
    }

    if (!user.verified) {
        return <Routes>
            <Route path='/' element={<Navigate replace to={"/not-verified"} />} />
            <Route path="*" element={<Navigate replace to={"/not-verified"} />} />
            <Route path='/not-verified' element={<NotVerifiedScreen />} />
            {
                authenticationRoutes
            }
        </Routes>
    }

    return children
}
export default AuthGate;