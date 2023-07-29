import * as React from 'react';
import { Grid, Toolbar } from "@mui/material";
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

const App = () => {

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return <Grid>
    <CustomAppBar logout={() => supabase.auth.signOut()} handleMenuClick={(val) => setDrawerOpen(val)} drawerOpen={drawerOpen} />
    <Toolbar />
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Navigate replace to={"/drinks"} />} />
        <Route path="/drinks" element={<DrinkList />} />
        <Route path='/drinks-admin' element={<AdminDrinkList />} />
        <Route path="/user" element={<UserScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/history-admin" element={<AdminHistoryScreen />} />
        <Route path="/pay" element={<PayDrinksScreen />} />
        <Route path='/payments-admin' element={<PaymentsPendingAdmin />} />
        <Route path='/users-admin' element={<AdminUserList />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <SideBar open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />
    </BrowserRouter>
  </Grid>
}
export default App;
