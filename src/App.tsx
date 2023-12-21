import * as React from 'react';
import { Grid } from "@mui/material";
import UserScreen from './components/User';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HistoryScreenProvider } from './components/HistoryScreen';
import { AdminDrinkListProvider } from './components/admin/AdminDrinkList';
import { PayDrinksScreenProvider } from './components/PayDrinksScreen';
import PaymentsPendingAdmin from './components/admin/PaymentsPendingAdmin';
import { AdminUserListProvider } from './components/admin/AdminUserList';
import { AdminHistoryScreenProvider } from './components/admin/AdminHistoryScreen';
import { useEffect } from 'react';
import Browse from './components/Browse';
import CreateEventProvider from './components/training/CreateEvent';
import { EventScreenProvider } from './components/training/EventScreen';
import { EventInformationProvider } from './components/training/EventInformation';
import CustomBottomNavigation from './components/BottomNavigation';
import UpdateAvailable from './components/UpdateAvailable';
import AuthGate from './AuthGate';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import { ManageGroupsProvider } from './components/groups/ManageGroups';
import BrowseAdmin from './components/admin/BrowseAdmin';
import DrinkStockUpdateScreen from './components/procure/DrinkStockUpdateScreen';
import { AnalyzeDrinkStockHistoryProvider } from './components/procure/AnalyzeDrinkStockHistory';
import { GroupInformationProvider } from './components/groups/GroupInformation';
import { DrinkListScreenProvider } from './components/drinkList/DrinkListScreen';
import FeatureNotAvailable from './components/FeatureNotAvailable';
import { SubscriptionHandler } from './components/SubscriptionHandler';
import { KeyHolderScreenProvider } from './components/KeyHolderScreen';
import OneSignal from 'react-onesignal';
import { NotificationsScreen } from './components/NotificationsScreen';
import { useServiceWorker } from './hooks/useServiceWorker';
import { Can } from './utils/PermissionService';

const App = () => {

  const { isUpdateAvailable, updateServiceWorker } = useServiceWorker();

  useEffect(() => {
    if (process.env.REACT_APP_oneSignalAppId) {
      OneSignal.init({
        appId: process.env.REACT_APP_oneSignalAppId,
        allowLocalhostAsSecureOrigin: true,
      }).then(() => {
        OneSignal.Slidedown.promptPush();
      });
    }
  }, []);

  if (isUpdateAvailable)
    return <UpdateAvailable update={updateServiceWorker} />

  return <Grid maxHeight={"100vh"}>
    <BrowserRouter>
      <AuthGate>
        <SubscriptionHandler>
          <Routes>
            <Route path='/' element={<Navigate replace to={"/drinks"} />} />
            <Route path="*" element={<Navigate replace to={"/drinks"} />} />

            <Route path='/feature-not-available' element={<FeatureNotAvailable />} />

            <Route path='/reset-password' element={<ResetPasswordScreen />} />

            <Route path='/browse' element={<Browse />} />
            <Route path='/browse-admin' element={<BrowseAdmin />} />
            <Route path="/drinks" element={<DrinkListScreenProvider />} />
            <Route path="/user" element={<UserScreen />} />
            <Route path="/history" element={<HistoryScreenProvider />} />
            <Route path="/payments" element={<PayDrinksScreenProvider />} />
            <Route path="/keys" element={<KeyHolderScreenProvider />} />
            <Route path="/notifications" element={<NotificationsScreen />} />

            <Route path="/trainer/groups" element={<ManageGroupsProvider />} />
            <Route path="/trainer/groups/:id" element={<GroupInformationProvider />} />

            <Route path="/training" element={<EventScreenProvider />} />
            <Route path="/training/event/:selectedEventId" element={<EventInformationProvider />} />
            <Route path="/training/create" element={<CreateEventProvider />} />

            <Route path='/admin/drinks' element={<AdminDrinkListProvider />} />

            <Route path="/admin/drinks/history" element={<AdminHistoryScreenProvider />} />
            <Route path='/admin/drinks/payments' element={<PaymentsPendingAdmin />} />
            <Route path='/admin/drinks/stocks' element={<DrinkStockUpdateScreen />} />
            <Route path='/admin/drinks/analyze' element={<AnalyzeDrinkStockHistoryProvider />} />
            <Route path='/admin/users' element={<AdminUserListProvider />} />
          </Routes>
          <div style={{ width: "100%", height: "56px" }} />
          <CustomBottomNavigation />
        </SubscriptionHandler>
      </AuthGate>
    </BrowserRouter>
  </Grid >
}
export default App;
