import { setUser } from "@sentry/react";
import React, { createContext } from "react";
import { useClient } from "react-supabase";
import { useDispatch, useSelector } from "react-redux";
import { onUserChange } from "./redux/applicationSlice";
import { Navigate, useNavigate } from "react-router-dom";
import LoginScreen from './components/LoginScreen';
import ForgotPasswordScreen from './components/ForgotPasswordScreen';
import RegisterScreen from './components/RegisterScreen';
import { Route, Routes } from 'react-router-dom';
import NotVerifiedScreen from "./components/NotVerifiedScreen";


const initialState = { session: null, user: null }
export const AuthContext = createContext(initialState)

const AuthGate = ({ children }) => {

    const { user } = useSelector(state => state.application);

    const client = useClient();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        client.auth.onAuthStateChange((event, session) => {
            console.log("auth state changed")
            setUser({ email: session?.user?.email ?? null, id: session?.user?.id ?? null });
            if (session?.user) {
                client.from("user").select().single().eq("userId", session.user.id).then(res => {
                    if (res && res.data) {
                        let user = {
                            ...session?.user ?? null,
                            role: res.data.role,
                            verified: res.data.verified
                        }
                        dispatch(onUserChange(user));
                    }
                })
            } else {
                dispatch(onUserChange(null));
                navigate("/login", { replace: true });
            }
        })
    }, []);

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