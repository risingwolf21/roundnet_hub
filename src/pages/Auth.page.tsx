import React, {useState} from "react";
import ForgotPasswordScreen from '../features/auth/ForgotPasswordScreen';
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';

export type AuthViewType =
    | 'sign_in'
    | 'sign_up'
    | 'forgotten_password'
    | 'magic_link'
    | 'update_password'

const AuthPage = () => {
    const [authView, setAuthView] = useState<AuthViewType>('sign_in');

    switch (authView) {
        case "sign_in":
            return <LoginScreen setAuthView={setAuthView}/>
        case "sign_up":
            return <RegisterScreen setAuthView={setAuthView}/>
        case "forgotten_password":
            return <ForgotPasswordScreen setAuthView={setAuthView}/>
        default:
            return null;
    }
}
export default AuthPage;