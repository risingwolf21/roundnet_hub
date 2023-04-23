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

const App = () => {
  const firebase = useFirebase();

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return <Grid>
    <CustomAppBar logout={() => firebase.logout()} handleMenuClick={(val) => setDrawerOpen(val)} drawerOpen={drawerOpen} />
    <Toolbar />
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Navigate replace to={"/drinks"} />} />
        <Route path="/drinks" element={<DrinkList />} />
        <Route path='/drinks-admin' element={<AdminDrinkList />} />
        <Route path="/user" element={<UserScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <SideBar open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />
    </BrowserRouter>
  </Grid>
}

export default App;
