import { Navigate, Outlet, useLocation } from 'react-router';

import { useApplication } from './ApplicationContext';


const AuthLayout = () => {

  const { user } = useApplication();
  const location = useLocation();

  const home = import.meta.env.VITE_APP_HOMEPAGE;

  if (user) {
    return <Navigate to={location.state?.path !== '/auth/login' ? location.state?.path || home : home} />;
  }

  return <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
    <Outlet />
  </div>
};
export default AuthLayout;
