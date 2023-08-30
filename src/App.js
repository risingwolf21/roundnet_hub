import * as React from 'react';
import { AppBar, BottomNavigation, Box, Grid, Tab, Tabs, Toolbar, Typography, Button } from "@mui/material";
import CustomAppBar from "./components/AppBar";
import DrinkList from './components/DrinkList';
import SideBar from './components/Sidebar';
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
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPaymentAsync } from './redux/paymentReducer';
import { fetchDrinksAsync } from './redux/drinkListReducer';
import { useClient } from 'react-supabase';
import { useAuth } from './hooks/useAuth';
import { fetchHistoryAsync } from './redux/historyReducer';
import Browse from './components/Browse';
import CustomBottomNavigation from './components/BottomNavigation';
import { useServiceWorker } from './hooks/useServiceWorker';
import { onAppUpdateAvailableChange } from './redux/applicationReducer';
import UpdateAvailable from './components/UpdateAvailable';

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
  }, [waitingWorker, showReload, reloadPage]);

  return <Grid maxHeight={"100vh"}>
    <BrowserRouter>
      {
        !appUpdateAvailable && <>
          <CustomAppBar logout={() => supabase.auth.signOut()} handleMenuClick={(val) => setDrawerOpen(val)} drawerOpen={drawerOpen} />
          <Toolbar />
          <SideBar open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />
          <Routes>
            <Route path='/' element={<Navigate replace to={"/drinks"} />} />
            <Route path='/browse' element={<Browse />} />
            <Route path="/drinks" element={<DrinkList />} />
            <Route path="/user" element={<UserScreen />} />
            <Route path="/history" element={<HistoryScreen />} />
            <Route path="/payments" element={<PayDrinksScreen />} />
            <Route path="*" element={<PageNotFound />} />

            <Route path='/admin/drinks' element={<AdminDrinkList />} />
            <Route path="/admin/drinks/history" element={<AdminHistoryScreen />} />
            <Route path='/admin/drinks/payments' element={<PaymentsPendingAdmin />} />
            <Route path='/admin/users' element={<AdminUserList />} />
          </Routes>
          <div style={{ width: "100%", height: "56px" }} />
          <CustomBottomNavigation />
        </>
      }
      {
        appUpdateAvailable && <UpdateAvailable update={reloadPage} />
      }
    </BrowserRouter>
  </Grid>
}
export default App;
