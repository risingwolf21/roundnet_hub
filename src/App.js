import * as React from 'react';
import { Grid, Toolbar } from "@mui/material";
import CustomAppBar from "./components/AppBar";
import DrinkList from './components/DrinkList';
import { useFirebase } from 'react-redux-firebase';
import SideBar from './components/Sidebar';
import UserScreen from './components/User';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './components/PageNotFound';
import HistoryScreen from './components/HistoryScreen';
import AdminDrinkList from './components/admin/AdminDrinkList';
import PayDrinksScreen from './components/PayDrinksScreen';
import { compose } from 'redux';
import { connect } from 'react-redux';
import PaymentsPendingAdmin from './components/admin/PaymentsPendingAdmin';
import AdminUserList from './components/admin/AdminUserList';
import { supabase } from './supabaseClient';

const App = ({ auth, dispatch }) => {

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return <Grid>
    <CustomAppBar logout={async () => await supabase.auth.signOut()} handleMenuClick={(val) => setDrawerOpen(val)} drawerOpen={drawerOpen} />
    <Toolbar />
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Navigate replace to={"/drinks"} />} />
        <Route path="/drinks" element={<DrinkList auth={auth} />} />
        <Route path='/drinks-admin' element={<AdminDrinkList />} />
        <Route path="/user" element={<UserScreen />} />
        <Route path="/history" element={<HistoryScreen auth={auth} />} />
        <Route path="/pay" element={<PayDrinksScreen auth={auth} />} />
        <Route path='/payments-admin' element={<PaymentsPendingAdmin auth={auth} />} />
        <Route path='/users-admin' element={<AdminUserList auth={auth} />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <SideBar open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />
    </BrowserRouter>
  </Grid>
}
export default compose(
  connect((state) => ({
    auth: state.firebase.auth,
    user: state.application.user
  }))
)(App);
