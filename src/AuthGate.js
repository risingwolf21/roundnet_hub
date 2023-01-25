import * as React from 'react';
import { authentication_changed } from "./redux/actions";
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import LoginScreen from "./components/LoginScreen";
import { useState } from "react";
import RegisterScreen from "./components/RegisterScreen";
import ForgotPasswordScreen from "./components/ForgotPasswordScreen";
import { compose } from "redux";
import { Box, Container } from '@mui/material';

const AuthGate = ({ dispatch, user, children }) => {

    const [errorMessage, setErrorMessage] = useState("");
    const [register, setRegister] = useState(false);
    const [forgotPassword, setForgotPassword] = useState(false);

    const switchPage = (onChange) => {
        setErrorMessage("");
        onChange();
    }

    const onLogin = (data) => {
        const email = data.email;
        const password = data.password;
        setErrorMessage("");

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredentials) => {
                const user = userCredentials.user;
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
        return <Box sx={{
            mb: 2,
            display: "flex",
            flexDirection: "column",
            height: 700,
            overflow: "hidden",
            overflowY: "scroll",
            // justifyContent="flex-end" # DO NOT USE THIS WITH 'scroll'
        }}>
            <Container>
                {
                    register ? <RegisterScreen onRegister={onRegister} gotoLogin={() => switchPage(setRegister(false))} errorMessage={errorMessage} />
                        : forgotPassword ? <ForgotPasswordScreen onForgotPassword={onForgotPassword} gotoLogin={() => switchPage(setForgotPassword(false))} errorMessage={errorMessage} />
                            : <LoginScreen onLogin={onLogin} gotoRegister={() => switchPage(setRegister(true))} gotoForgotPassword={() => switchPage(setForgotPassword(true))} errorMessage={errorMessage} />
                }
            </Container>
        </Box>
    }
    else {
        return children;
    }
}

const mapStateToProps = createStructuredSelector({
    user: state => state.application.user
});
export default compose(connect(mapStateToProps))(AuthGate);