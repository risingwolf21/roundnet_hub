import * as React from 'react';
import { Grid } from "@mui/material";
import DrinkList from './components/DrinkList';
import UserScreen from './components/User';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HistoryScreen from './components/HistoryScreen';
import AdminDrinkList from './components/admin/AdminDrinkList';
import PayDrinksScreen from './components/PayDrinksScreen';
import PaymentsPendingAdmin from './components/admin/PaymentsPendingAdmin';
import AdminUserList from './components/admin/AdminUserList';
import AdminHistoryScreen from './components/admin/AdminHistoryScreen';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useClient } from 'react-supabase';
import { fetchHistoryAsync, fetchDrinksAsync, fetchPaymentAsync } from './redux/drinksSlice';
import Browse from './components/Browse';
import CreateEvent from './components/training/CreateEvent';
import EventScreen from './components/training/EventScreen';
import EventInformation from './components/training/EventInformation';
import CustomBottomNavigation from './components/BottomNavigation';
import { useServiceWorker } from './hooks/useServiceWorker';
import { onAppUpdateAvailableChange, onAppVersionChange } from './redux/applicationSlice';
import UpdateAvailable from './components/UpdateAvailable';
import AuthGate from './AuthGate';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import SubscriptionHandler from './components/SubscriptionHandler';
import ManageGroupsScreen from './components/groups/ManageGroups';
import BrowseAdmin from './components/admin/BrowseAdmin';
import DrinkStockUpdateScreen from './components/procure/DrinkStockUpdateScreen';
import AnalyzeDrinkStockHistory from './components/procure/AnalyzeDrinkStockHistory';
import raw from "./git_commit.txt";
import { fetchUserGroupsAsync } from './redux/eventSlice';
import { GroupInformation } from './components/groups/GroupInformation';
import { DependencyContext, useAppDispatch } from '.';
import { RootState } from './redux/store';

const App = () => {

  const { waitingWorker, showReload, reloadPage } = useServiceWorker();
  const container = React.useContext(DependencyContext);
  const dispatch = useAppDispatch();
  const client = useClient();
  const { appUpdateAvailable, user } = useSelector((state: RootState) => state.application);

  useEffect(() => {
    fetch(raw)
      .then(r => r.text())
      .then(text => {
        dispatch(onAppVersionChange(text));
      });
  }, [dispatch, raw])

  useEffect(() => {
    dispatch(fetchPaymentAsync({ client, user }));
    dispatch(fetchHistoryAsync({ client, user, page: 0, count: 20 }));
    dispatch(fetchUserGroupsAsync({ client, user }));
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
                <Route path="/trainer/groups/:id" element={<GroupInformation />} />

                <Route path="/training" element={<EventScreen />} />
                <Route path="/training/event/:selectedEventId" element={<EventInformation />} />
                <Route path="/training/create" element={<CreateEvent />} />

                <Route path='/admin/drinks' element={<AdminDrinkList />} />
                <Route path="/admin/drinks/history" element={<AdminHistoryScreen />} />
                <Route path='/admin/drinks/payments' element={<PaymentsPendingAdmin />} />
                <Route path='/admin/drinks/stocks' element={<DrinkStockUpdateScreen />} />
                <Route path='/admin/drinks/analyze' element={<AnalyzeDrinkStockHistory />} />
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
