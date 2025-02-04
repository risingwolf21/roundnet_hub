import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { InitialFetch } from 'src/components/InitialFetch';

export const ProtectedLayout = () => {
  const { session, user } = useAuth();
  const location = useLocation();

  if (!session || !user){
    console.log("not session or user", session, user)
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <InitialFetch>
    <Outlet />
  </InitialFetch>
};
