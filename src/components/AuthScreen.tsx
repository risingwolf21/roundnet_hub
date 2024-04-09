import React, {useState} from "react";
import ForgotPasswordScreen from './ForgotPasswordScreen';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import {useSelector} from "react-redux";
import {RootState} from "../redux/store";
import {Navigate, useLocation} from "react-router-dom";
import {HOMEPAGE} from "../constants";

type CURRENT_SCREEN = "LOGIN" | "REGISTER" | "FORGOT_PASSWORD";

const AuthScreen = () => {
    const [currentScreen, setCurrentScreen] = useState<CURRENT_SCREEN>("LOGIN");
    const {user} = useSelector((state: RootState) => state.application);
    const location = useLocation();

    if (user) {
        return <Navigate to={`/${HOMEPAGE}`} state={{from: location}}/>
    } else if (currentScreen === "LOGIN") {
        return <LoginScreen goToRegister={() => setCurrentScreen("REGISTER")}
                            goToForgotPassword={() => setCurrentScreen("FORGOT_PASSWORD")}/>
    } else if (currentScreen === "REGISTER") {
        return <RegisterScreen goToLogin={() => setCurrentScreen("LOGIN")}/>
    } else {
        return <ForgotPasswordScreen goToLogin={() => setCurrentScreen("LOGIN")}/>
    }
}
export default AuthScreen;