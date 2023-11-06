import * as React from 'react';
import { Grid } from "@mui/material";
import { DrinkListProvider } from './components/DrinkList';
import UserScreen from './components/User';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HistoryScreenProvider } from './components/HistoryScreen';
import { AdminDrinkListProvider } from './components/admin/AdminDrinkList';
import { PayDrinksScreenProvider } from './components/PayDrinksScreen';
import PaymentsPendingAdmin from './components/admin/PaymentsPendingAdmin';
import AdminUserList from './components/admin/AdminUserList';
import { AdminHistoryScreenProvider } from './components/admin/AdminHistoryScreen';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useClient } from 'react-supabase';
import Browse from './components/Browse';
import CreateEvent from './components/training/CreateEvent';
import EventScreen from './components/training/EventScreen';
import EventInformation from './components/training/EventInformation';
import CustomBottomNavigation from './components/BottomNavigation';
//@ts-ignore
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
import { useAppDispatch } from '.';
import { RootState } from './redux/store';
import { GroupInformation } from './components/groups/GroupInformation';
import { useDependency } from './hooks/useDependency';
import { IDrinkRepository } from './repository/IDrinkRepository';

const App = () => {

  const { waitingWorker, showReload, reloadPage } = useServiceWorker();
  const dispatch = useAppDispatch();
  const { appUpdateAvailable } = useSelector((state: RootState) => state.application);

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
                <Route path="/drinks" element={<DrinkListProvider />} />
                <Route path="/user" element={<UserScreen />} />
                <Route path="/history" element={<HistoryScreenProvider />} />
                <Route path="/payments" element={<PayDrinksScreenProvider />} />

                {/* <Route path="/trainer/groups" element={<ManageGroupsScreen />} />
                <Route path="/trainer/groups/:id" element={<GroupInformation />} />

                <Route path="/training" element={<EventScreen />} />
                <Route path="/training/event/:selectedEventId" element={<EventInformation />} />
                <Route path="/training/create" element={<CreateEvent />} /> */}

                <Route path='/admin/drinks' element={<AdminDrinkListProvider />} />
                <Route path="/admin/drinks/history" element={<AdminHistoryScreenProvider />} />
                <Route path='/admin/drinks/payments' element={<PaymentsPendingAdmin />} />
                <Route path='/admin/drinks/stocks' element={<DrinkStockUpdateScreen />} />
                {/* <Route path='/admin/drinks/analyze' element={<AnalyzeDrinkStockHistory />} /> */}
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
