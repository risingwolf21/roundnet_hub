import React from 'react'
import { useEffect } from 'react';
import { useSelector } from "react-redux"
import { Navigate, useLocation, useNavigate } from "react-router-dom"

const ProtectedRoute = ({ children }) => {
    const { user } = useSelector((state) => state.application);
    let location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user || !user.id) {
            navigate("/login", { replace: true });
        }
    }, [user]);

    if (!user || !user.id) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }
    return children
};

export default ProtectedRoute;