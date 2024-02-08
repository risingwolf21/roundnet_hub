import React, {useState} from "react";
import ForgotPasswordScreen from './ForgotPasswordScreen';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';

type CURRENT_SCREEN = "LOGIN" | "REGISTER" | "FORGOT_PASSWORD";

const AuthScreen = () => {
    const [currentScreen, setCurrentScreen] = useState<CURRENT_SCREEN>("LOGIN");

    if (currentScreen === "LOGIN") {
        return <LoginScreen goToRegister={() => setCurrentScreen("REGISTER")}
                            goToForgotPassword={() => setCurrentScreen("FORGOT_PASSWORD")}/>
    } else if (currentScreen === "REGISTER") {
        return <RegisterScreen goToLogin={() => setCurrentScreen("LOGIN")}/>
    } else {
        return <ForgotPasswordScreen goToLogin={() => setCurrentScreen("LOGIN")}/>
    }
}
export default AuthScreen;