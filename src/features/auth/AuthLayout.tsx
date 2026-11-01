import { Navigate, Outlet, useLocation } from 'react-router';

import { useApplication } from './ApplicationContext';


const AuthLayout = () => {

  const { user } = useApplication();
  const location = useLocation();

  const home = import.meta.env.VITE_APP_HOMEPAGE;

  // The recovery link establishes a (recovery) session, which makes `user` truthy — but the
  // visitor still has to set a new password here, so never bounce away from reset-password.
  const isResetPassword = location.pathname === '/auth/reset-password';

  if (user && !isResetPassword) {
    return <Navigate to={location.state?.path !== '/auth/login' ? location.state?.path || home : home} />;
  }

  return <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
    <Outlet />
  </div>
};
export default AuthLayout;
