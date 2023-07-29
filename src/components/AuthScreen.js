import { useState } from "react"
import ForgotPasswordScreen from "./ForgotPasswordScreen";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import { supabase } from "../supabaseClient";

const AuthScreen = () => {
    const [currentScreen, setCurrentScreen] = useState("login");
    const [errorMessage, setErrorMessage] = useState("");

    const onLogin = async (credentials) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
        });
        if (error)
            setErrorMessage(error.message);
        else
            supabase.from("user").select().eq("userId", data.user.id).then(async res => {
                if (res.data.length === 1) {
                    await supabase.auth.updateUser({
                        data: { role: res.data[0].role }
                    });
                }
            })
    }

    const onRegister = async ({ email, password, displayName }) => {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    displayName,
                    email,
                    role: "user",
                }
            }
        });

        let { updatingUserError } = await supabase.auth.updateUser({ data: { userId: data.user.id } })
        let { writingError } = await supabase.from("user").upsert({ email, displayName, userId: data.user.id, role: "user" })

        if (error)
            setErrorMessage(JSON.stringify(error));
        if (updatingUserError)
            setErrorMessage(JSON.stringify(updatingUserError));
        if (writingError)
            setErrorMessage(JSON.stringify(writingError));
    }

    if (currentScreen === "register") {
        return <RegisterScreen onRegister={onRegister} errorMessage={errorMessage} gotoLogin={() => setCurrentScreen("login")} />
    } else if (currentScreen === "forgotPassword") {
        return <ForgotPasswordScreen errorMessage={errorMessage} gotoLogin={() => setCurrentScreen("login")} />
    } else {
        return <LoginScreen
            onLogin={onLogin} errorMessage={errorMessage}
            gotoRegister={() => setCurrentScreen("register")}
            gotoForgotPassword={() => setCurrentScreen("forgotPassword")} />
    }
}
export default AuthScreen;