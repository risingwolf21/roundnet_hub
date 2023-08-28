import * as React from 'react';
import { AppBar, Box, Grid, Tab, Tabs, Toolbar } from "@mui/material";
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
import { useDispatch } from 'react-redux';
import { fetchPaymentAsync } from './redux/paymentReducer';
import { fetchDrinksAsync } from './redux/drinkListReducer';
import { useClient } from 'react-supabase';
import { useAuth } from './hooks/useAuth';
import { fetchHistoryAsync } from './redux/historyReducer';

const App = () => {

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const dispatch = useDispatch();
  const client = useClient();
  const { user } = useAuth();

  useEffect(() => {
    dispatch(fetchPaymentAsync({ client, user }));
    dispatch(fetchHistoryAsync({ client, user }));
    dispatch(fetchDrinksAsync(client));
  }, [client, user, dispatch]);

  return <Grid>
    <CustomAppBar logout={() => supabase.auth.signOut()} handleMenuClick={(val) => setDrawerOpen(val)} drawerOpen={drawerOpen} />
    <Toolbar />
    <BrowserRouter>
      <SideBar open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />
      <Routes>
        <Route path='/' element={<Navigate replace to={"/drinks"} />} />
        <Route path="/drinks" element={<DrinkList />} />
        <Route path="/user" element={<UserScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/payments" element={<PayDrinksScreen />} />
        <Route path="*" element={<PageNotFound />} />
        
        <Route path='/drinks-admin' element={<AdminDrinkList />} />
        <Route path="/history-admin" element={<AdminHistoryScreen />} />
        <Route path='/payments-admin' element={<PaymentsPendingAdmin />} />
        <Route path='/users-admin' element={<AdminUserList />} />
      </Routes>
    </BrowserRouter>
  </Grid>
}
export default App;
