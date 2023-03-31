import { useState } from "react"
import { useFirebase } from "react-redux-firebase";
import ForgotPasswordScreen from "./ForgotPasswordScreen";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";

const AuthScreen = () => {
    const firebase = useFirebase();
    const [currentScreen, setCurrentScreen] = useState("login");
    const [errorMessage, setErrorMessage] = useState("");

    const onLogin = (credentials) => {
        firebase.login(credentials).catch((error) => {
            setErrorMessage(error.message);
        });
    }

    const onForgotPassword = (email) => {
        firebase.resetPassword(email).catch((error) => {
            setErrorMessage(error.message);
        });
    }

    const onRegister = (credentials, profile) => {
        firebase.createUser(credentials, profile).catch((error) => {
            setErrorMessage(error.message);
        });
    }

    if (currentScreen === "register") {
        return <RegisterScreen onRegister={onRegister} errorMessage={errorMessage} gotoLogin={() => setCurrentScreen("login")} />
    } else if (currentScreen === "forgotPassword") {
        return <ForgotPasswordScreen onForgotPassword={onForgotPassword} errorMessage={errorMessage} gotoLogin={() => setCurrentScreen("login")} />
    } else {
        return <LoginScreen
            onLogin={onLogin} errorMessage={errorMessage}
            gotoRegister={() => setCurrentScreen("register")}
            gotoForgotPassword={() => setCurrentScreen("forgotPassword")} />
    }
}
export default AuthScreen;