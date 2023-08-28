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
import { useDispatch, useSelector } from 'react-redux';
import { fetchPaymentAsync } from './redux/paymentReducer';
import { fetchDrinksAsync } from './redux/drinkListReducer';
import { useClient } from 'react-supabase';
import { useAuth } from './hooks/useAuth';
import { fetchHistoryAsync } from './redux/historyReducer';
import { fetchEventsAsync } from './redux/eventReducer';
import EventScreen from './components/training/EventScreen';
import CustomBottomNavigation from './components/BottomNavigation';
import EventInformation from './components/training/EventInformation';
import CreateEvent from './components/training/CreateEvent';

const App = () => {

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const dispatch = useDispatch();
  const client = useClient();
  const { user } = useAuth();

  const { mode } = useSelector((state) => state.application);

  useEffect(() => {
    dispatch(fetchPaymentAsync({ client, user }));
    dispatch(fetchHistoryAsync({ client, user }));
    dispatch(fetchDrinksAsync(client));
    dispatch(fetchEventsAsync(client));
  }, [client, user, dispatch]);

  return <Grid>
    <BrowserRouter>
      {
        mode === "drinks" && <SideBar open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />
      }
      <CustomAppBar logout={() => supabase.auth.signOut()} handleMenuClick={(val) => setDrawerOpen(val)} drawerOpen={drawerOpen} />
      <Toolbar />
      {/* <Tabs value={0}><Tab /></Tabs> */}
      <Routes>
        <Route path='/' element={<Navigate replace to={"/drinks"} />} />
        <Route path="/drinks" element={<DrinkList />} />
        <Route path="/user" element={<UserScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/payments" element={<PayDrinksScreen />} />
        <Route path="/training" element={<EventScreen />} />
        <Route path="/training/event" element={<EventInformation />} />
        <Route path="/training/create" element={<CreateEvent />} />
        <Route path="*" element={<PageNotFound />} />

        {/* ADMIN SCREENS */}
        <Route path='/admin/users' element={<AdminUserList />} />
        <Route path="/admin/drinks/history" element={<AdminHistoryScreen />} />
        <Route path='/admin/drinks/payments' element={<PaymentsPendingAdmin />} />
        <Route path='/admin/drinks' element={<AdminDrinkList />} />
      </Routes>

      <CustomBottomNavigation />

    </BrowserRouter>

  </Grid >
}
export default App;
