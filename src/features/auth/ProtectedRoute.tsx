import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApplication } from './AuthContext';
import { InitialFetch } from 'src/components/InitialFetch';

export const ProtectedLayout = () => {
  const { user } = useApplication();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <InitialFetch>
    <Outlet />
  </InitialFetch>
};
