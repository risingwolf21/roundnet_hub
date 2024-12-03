import React from "react";
import ForgotPasswordScreen from '../features/auth/ForgotPasswordScreen';
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';
import {Navigate, Route, Routes} from "react-router-dom";
import ResetPasswordScreen from "../features/auth/ResetPasswordScreen";
import {Session} from "@supabase/supabase-js";

type AuthPageProps = {
    onLoggedIn: (session: Session) => void
}

const AuthPage = ({onLoggedIn}: AuthPageProps) => {

    return <Routes>
        <Route path='/' element={<Navigate replace to={`/login`}/>}/>
        <Route path='*' element={<Navigate replace to={`/login`}/>}/>

        <Route path='/login' element={<LoginScreen onLoggedIn={onLoggedIn}/>}/>
        <Route path='/register' element={<RegisterScreen/>}/>
        <Route path='/forgot-password' element={<ForgotPasswordScreen/>}/>
        <Route path='/reset-password' element={<ResetPasswordScreen/>}/>
    </Routes>
}
export default AuthPage;