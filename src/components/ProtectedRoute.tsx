import {Navigate, useLocation} from "react-router-dom";
import React from "react";
import {useSelector} from "react-redux";
import {RootState} from "../redux/store";

export const ProtectedRoute = ({children}: { children: JSX.Element | JSX.Element[] }) => {

    const {user} = useSelector((state: RootState) => state.application);
    const location = useLocation();

    if (!user) {
        return <Navigate to={"/auth"} state={{from: location}}/>
    } else if (!user.verified)
        return <Navigate to={"/not-verified"} state={{from: location}}/>

    return children
}


export default ProtectedRoute;