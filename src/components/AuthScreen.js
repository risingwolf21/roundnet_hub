import { useEffect, useState } from "react"
import ForgotPasswordScreen from "./ForgotPasswordScreen";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import { supabase } from "../supabaseClient";

const AuthScreen = () => {
    const [currentScreen, setCurrentScreen] = useState("login");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                const newPassword = prompt("What would you like your new password to be?");
                const { data, error } = await supabase.auth
                    .updateUser({ password: newPassword })

                if (data) alert("Password updated successfully!")
                if (error) alert("There was an error updating your password.")
            }
        })
    }, [])

    const onLogin = async (credentials) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
        });
        setErrorMessage(error.message);
    }

    const onForgotPassword = async (email) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail({
            email
        });
        setErrorMessage(error.message);
    }

    const onRegister = async ({ email, password, displayName }) => {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    displayName,
                    email
                }
            }
        });
        setErrorMessage(error);
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