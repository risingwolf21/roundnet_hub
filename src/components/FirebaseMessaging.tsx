import {useSelector} from "react-redux";
import {RootState} from "../redux/store";
import {useFirebase} from "../hooks/useFirebase";
import {ToastContainer} from "react-toastify";
import React from "react";
import 'react-toastify/dist/ReactToastify.css';

export const FirebaseMessaging = ({children}: { children: string | JSX.Element | JSX.Element[] }) => {
    const {user} = useSelector((state: RootState) => state.application);
    useFirebase(user);

    return <>
        {children}
        <ToastContainer
            position="top-center"
            newestOnTop
            closeOnClick={false}
            draggable
        />
    </>;
}