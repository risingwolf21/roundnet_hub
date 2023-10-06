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
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useClient } from 'react-supabase';
import { useAuth } from './hooks/useAuth';
import { fetchHistoryAsync, fetchDrinksAsync, fetchPaymentAsync } from './redux/drinksSlice';
import Browse from './components/Browse';
import CreateEvent from './components/training/CreateEvent';
import EventScreen from './components/training/EventScreen';
import EventInformation from './components/training/EventInformation';
import CustomBottomNavigation from './components/BottomNavigation';
import { useServiceWorker } from './hooks/useServiceWorker';
import { onAppUpdateAvailableChange } from './redux/applicationSlice';
import UpdateAvailable from './components/UpdateAvailable';
import AuthGate from './AuthGate';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import SubscriptionHandler from './components/SubscriptionHandler';
import ManageGroupsScreen from './components/ManageGroups';
import BrowseAdmin from './components/admin/BrowseAdmin';

const App = () => {

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
      <AuthGate>
        <SubscriptionHandler>
          {
            !appUpdateAvailable && <>
              <Routes>
                <Route path='/' element={<Navigate replace to={"/drinks"} />} />
                <Route path="*" element={<Navigate replace to={"/drinks"} />} />

                <Route path='/reset-password' element={<ResetPasswordScreen />} />

                <Route path='/browse' element={<Browse />} />
                <Route path='/browse-admin' element={<BrowseAdmin />} />
                <Route path="/drinks" element={<DrinkList />} />
                <Route path="/user" element={<UserScreen />} />
                <Route path="/history" element={<HistoryScreen />} />
                <Route path="/payments" element={<PayDrinksScreen />} />

                <Route path="/trainer/groups" element={<ManageGroupsScreen />} />

                <Route path="/training" element={<EventScreen />} />
                <Route path="/training/event/:selectedEventId" element={<EventInformation />} />
                <Route path="/training/create" element={<CreateEvent />} />

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
        </SubscriptionHandler>
      </AuthGate>
    </BrowserRouter>

  </Grid >
}
export default App;
