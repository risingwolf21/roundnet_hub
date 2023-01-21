import { authentication_changed } from "./redux/actions";
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import LoginScreen from "./components/LoginScreen";
import { useState } from "react";
import RegisterScreen from "./components/RegisterScreen";
import ForgotPasswordScreen from "./components/ForgotPasswordScreen";
import { compose } from "redux";

const AuthGate = ({ dispatch, user, children }) => {

    const [errorMessage, setErrorMessage] = useState("");
    const [register, setRegister] = useState(false);
    const [forgotPassword, setForgotPassword] = useState(false);

    const onLogin = (data) => {
        const email = data.email;
        const password = data.password;
        setErrorMessage("");

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredentials) => {
                const user = userCredentials.user;
                console.log("logged in " + user.email);
                dispatch(authentication_changed(user));
            })
            .catch((error) => {
                const errorMessage = error.message;
                setErrorMessage(errorMessage);
            })
    }

    const onRegister = (data) => {
        const email = data.email;
        const password = data.password;
        setErrorMessage("");

        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredentials) => {
                const user = userCredentials.user;
                console.log("registered in " + user.email);
                dispatch(authentication_changed(user));
            })
            .catch((error) => {
                const errorMessage = error.message;
                setErrorMessage(errorMessage);
            });
    }

    const onForgotPassword = (data) => {
        firebase.auth().sendPasswordResetEmail(data.email)
            .catch((error) => {
                const errorMessage = error.message;
                setErrorMessage(errorMessage);
            });
    }

    if (!user) {
        if (register) {
            return <RegisterScreen onRegister={onRegister} gotoLogin={() => setRegister(false)} />
        } else if (forgotPassword) {
            return <ForgotPasswordScreen onForgotPassword={onForgotPassword} gotoLogin={() => setForgotPassword(false)} />
        } else {
            return <LoginScreen onLogin={onLogin} errorMessage={errorMessage} gotoRegister={() => setRegister(true)} gotoForgotPassword={() => setForgotPassword(true)} />
        }
    }
    else {
        return children;
    }
}

const mapStateToProps = createStructuredSelector({
    user: state => state.application.user
});
export default compose(connect(mapStateToProps))(AuthGate);