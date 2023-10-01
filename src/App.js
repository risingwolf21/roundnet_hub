import * as React from 'react';
import { Grid, Toolbar } from "@mui/material";
import CustomAppBar from "./components/AppBar";
import DrinkList from './components/DrinkList';
import UserScreen from './components/User';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './components/PageNotFound';
import HistoryScreen from './components/HistoryScreen';
import AdminDrinkList from './components/admin/AdminDrinkList';
import PayDrinksScreen from './components/PayDrinksScreen';
import PaymentsPendingAdmin from './components/admin/PaymentsPendingAdmin';
import AdminUserList from './components/admin/AdminUserList';
import { supabase } from './supabaseClient';
import AdminHistoryScreen from './components/admin/AdminHistoryScreen';
import UpdateAvailable from './components/UpdateAvailable';
import CustomBottomNavigation from './components/BottomNavigation';
import Browse from './components/Browse';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPaymentAsync } from './redux/paymentSlice';
import { fetchDrinksAsync } from './redux/drinksSlice';
import { useClient } from 'react-supabase';
import { useAuth } from './hooks/useAuth';
import { fetchHistoryAsync } from './redux/drinksSlice';
import { onAppUpdateAvailableChange } from './redux/applicationSlice';
import { useServiceWorker } from './hooks/useServiceWorker';
import LoginScreen from './components/LoginScreen';
import ForgotPasswordScreen from './components/ForgotPasswordScreen';
import RegisterScreen from './components/RegisterScreen';
import ProtectedRoute from './components/ProtectedRoute';
import ResetPassword from './components/ResetPassword';
import ResetPasswordScreen from './components/ResetPasswordScreen';

const App = () => {

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { waitingWorker, showReload, reloadPage } = useServiceWorker();
  const dispatch = useDispatch();
  const client = useClient();
  const { user } = useAuth();
  const { appUpdateAvailable } = useSelector((state) => state.application);

  useEffect(() => {
    dispatch(fetchPaymentAsync({ client, user }));
    dispatch(fetchHistoryAsync({ client, user }));
    dispatch(fetchDrinksAsync(client));
  }, [client, user, dispatch]);

  useEffect(() => {
    dispatch(onAppUpdateAvailableChange(showReload && waitingWorker));
  }, [waitingWorker, showReload, reloadPage, dispatch]);

  return <Grid maxHeight={"100vh"}>
    <BrowserRouter>
      {
        !appUpdateAvailable && <>
          <CustomAppBar logout={() => supabase.auth.signOut()} handleMenuClick={(val) => setDrawerOpen(val)} drawerOpen={drawerOpen} />
          <Toolbar />
          <Routes>
            <Route path='/' element={<Navigate replace to={"/drinks"} />} />
            <Route path="*" element={<PageNotFound />} />

            <Route path='/login' element={<LoginScreen />} />
            <Route path='/register' element={<RegisterScreen />} />
            <Route path='/forgot-password' element={<ForgotPasswordScreen />} />
            <Route path='/reset-password' element={<ResetPasswordScreen />} />

            <Route path='/browse' element={<ProtectedRoute><Browse /></ProtectedRoute>} />
            <Route path="/drinks" element={<ProtectedRoute><DrinkList /></ProtectedRoute>} />
            <Route path="/user" element={<ProtectedRoute><UserScreen /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryScreen /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><PayDrinksScreen /></ProtectedRoute>} />

            <Route path='/admin/drinks' element={<ProtectedRoute><AdminDrinkList /></ProtectedRoute>} />
            <Route path="/admin/drinks/history" element={<ProtectedRoute><AdminHistoryScreen /></ProtectedRoute>} />
            <Route path='/admin/drinks/payments' element={<ProtectedRoute><PaymentsPendingAdmin /></ProtectedRoute>} />
            <Route path='/admin/users' element={<ProtectedRoute><AdminUserList /></ProtectedRoute>} />
          </Routes>
          {
            user?.id && <>
              <div style={{ width: "100%", height: "56px" }} />
              <CustomBottomNavigation />
            </>
          }
        </>
      }
      {
        appUpdateAvailable && <UpdateAvailable update={reloadPage} />
      }
    </BrowserRouter>

  </Grid >
}
export default App;
