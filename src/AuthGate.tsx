import { setUser } from "@sentry/react";
import React, { createContext, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useClient } from "react-supabase";
import ForgotPasswordScreen from './components/ForgotPasswordScreen';
import LoginScreen from './components/LoginScreen';
import NotVerifiedScreen from "./components/NotVerifiedScreen";
import RegisterScreen from './components/RegisterScreen';
import ResetPasswordScreen from "./components/ResetPasswordScreen";
import UserScreen from "./components/User";
import { supabaseAdmin } from "./components/services/supabase/supabaseClient";
import { TABLE_USER } from "./constants";
import { onUserChange } from "./redux/applicationSlice";
import { RootState } from "./redux/store";
import container from "./repository/Container";
import { EmptyAdminDrinksRepository, IAdminDrinksRepository, SupabaseAdminDrinksRepository } from "./repository/IAdminDrinksRepository";
import { EmptyAdminUsersRepository, IAdminUsersRepository, SupabaseAdminUsersRepository } from "./repository/IAdminUsersRepository";
import { User } from "./types/supabaseTypes";
import { ability, defineRulesFor } from "./utils/PermissionService";


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
        const { data } = client.auth.onAuthStateChange((event, session) => {
            console.log(`Supabase auth event: ${event}`);
            setUser({ email: session?.user?.email, id: session?.user?.id });
            if (session && session.user) {
                client.from(TABLE_USER).select().eq("userId", session.user.id).single().then((res) => {
                    if (res && res.data) {
                        let user = {
                            userId: session.user.id,
                            email: session.user.email,
                            displayName: session.user.user_metadata.displayName,
                            role: res.data.role,
                            verified: res.data.verified,
                            permissions: res.data.permissions ?? [],
                            notifications: res.data.notificationTags ?? []
                        } as User;
                        if (!container.isBound("IAdminDrinksRepository"))
                            container.bind<IAdminDrinksRepository>("IAdminDrinksRepository").toDynamicValue(() => {
                                if (user.role === "admin") {
                                    return new SupabaseAdminDrinksRepository(supabaseAdmin);
                                } else {
                                    return new EmptyAdminDrinksRepository();
                                }
                            });
                        else if (user.role === "admin")
                            container.rebind<IAdminDrinksRepository>("IAdminDrinksRepository").toDynamicValue(() => new SupabaseAdminDrinksRepository(supabaseAdmin));

                        if (!container.isBound("IAdminUsersRepository"))
                            container.bind<IAdminUsersRepository>("IAdminUsersRepository").toDynamicValue(() => {
                                if (user.role === "admin") {
                                    return new SupabaseAdminUsersRepository(supabaseAdmin);
                                } else {
                                    return new EmptyAdminUsersRepository();
                                }
                            });
                        else if (user.role === "admin")
                            container.rebind<IAdminUsersRepository>("IAdminUsersRepository").toDynamicValue(() => new SupabaseAdminUsersRepository(supabaseAdmin));

                        ability.update(defineRulesFor(user))

                        dispatch(onUserChange(user));
                    }
                })
            } else if (user !== null) {
                if (container.isBound("IAdminUsersRepository"))
                    container.rebind<IAdminUsersRepository>("IAdminUsersRepository").toDynamicValue(() => new EmptyAdminUsersRepository());
                if (container.isBound("IAdminDrinksRepository"))
                    container.rebind<IAdminDrinksRepository>("IAdminDrinksRepository").toDynamicValue(() => new EmptyAdminDrinksRepository());

                ability.update(defineRulesFor(null))

                dispatch(onUserChange(null));
                navigate("/login", { replace: true });
            }
        })
        return () => {
            data.subscription.unsubscribe();
        }
    }, [client, dispatch, navigate]);

    const authenticationRoutes = [
        <Route key={"/"} path='/' element={<Navigate replace to={"/login"} />} />,
        <Route key={"*"} path="*" element={<Navigate replace to={"/login"} />} />,
        <Route key={"login"} path='/login' element={<LoginScreen />} />,
        <Route key={"/"} path='/' element={<Navigate replace to={"/login"} />} />,
        <Route key={"*"} path="*" element={<Navigate replace to={"/login"} />} />,
        <Route key={"register"} path='/register' element={<RegisterScreen />} />,
        <Route key={"reset-password"} path='/reset-password' element={<ResetPasswordScreen />} />,
        <Route key={"forgot-password"} path='/forgot-password' element={<ForgotPasswordScreen />} />
    ];

    if (!user) {
        return <Routes>
            {
                authenticationRoutes
            }
        </Routes>
    } else if (!user.verified) {
        return <Routes>
            <Route key={"not-verified"} path='/not-verified' element={<NotVerifiedScreen />} />
            <Route key={"*"} path="*" element={<Navigate replace to={"/not-verified"} />} />
            <Route key={"/"} path='/' element={<Navigate replace to={"/not-verified"} />} />
            <Route path="/user" element={<UserScreen />} />
        </Routes>
    } else {
        return children
    }
}
export default AuthGate;