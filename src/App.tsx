import { Grid } from "@mui/material";
import * as React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthGate from './AuthGate';
import CustomBottomNavigation from './components/BottomNavigation';
import Browse from './components/Browse';
import FeatureNotAvailable from './components/FeatureNotAvailable';
import { HistoryScreenProvider } from './components/HistoryScreen';
import { KeyHolderScreenProvider } from './components/KeyHolderScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { PayDrinksScreenProvider } from './components/PayDrinksScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import { SubscriptionHandler } from './components/SubscriptionHandler';
import UpdateAvailable from './components/UpdateAvailable';
import UserScreen from './components/User';
import { AdminDrinkListProvider } from './components/admin/AdminDrinkList';
import { AdminHistoryScreenProvider } from './components/admin/AdminHistoryScreen';
import { AdminUserListProvider } from './components/admin/AdminUserList';
import BrowseAdmin from './components/admin/BrowseAdmin';
import PaymentsPendingAdmin from './components/admin/PaymentsPendingAdmin';
import { DrinkListScreenProvider } from './components/drinkList/DrinkListScreen';
import { GroupInformationProvider } from './components/groups/GroupInformation';
import { ManageGroupsProvider } from './components/groups/ManageGroups';
import { AnalyzeDrinkStockHistoryProvider } from './components/procure/AnalyzeDrinkStockHistory';
import DrinkStockUpdateScreen from './components/procure/DrinkStockUpdateScreen';
import CreateEventProvider from './components/training/CreateEvent';
import { EventInformationProvider } from './components/training/EventInformation';
import { EventScreenProvider } from './components/training/EventScreen';
import { useServiceWorker } from './hooks/useServiceWorker';

const App = () => {

  const { isUpdateAvailable, updateServiceWorker } = useServiceWorker();

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
  </Grid>
}
export default App;
