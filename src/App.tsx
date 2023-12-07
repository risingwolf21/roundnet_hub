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
import { useSelector } from 'react-redux';
import Browse from './components/Browse';
import CreateEventProvider from './components/training/CreateEvent';
import { EventScreenProvider } from './components/training/EventScreen';
import { EventInformationProvider } from './components/training/EventInformation';
import CustomBottomNavigation from './components/BottomNavigation';
//@ts-ignore
import { useServiceWorker } from 'src/hooks/useServiceWorker';
import { onAppUpdateAvailableChange } from './redux/applicationSlice';
import UpdateAvailable from './components/UpdateAvailable';
import AuthGate from './AuthGate';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import { ManageGroupsProvider } from './components/groups/ManageGroups';
import BrowseAdmin from './components/admin/BrowseAdmin';
import DrinkStockUpdateScreen from './components/procure/DrinkStockUpdateScreen';
import { AnalyzeDrinkStockHistoryProvider } from './components/procure/AnalyzeDrinkStockHistory';
import { useAppDispatch } from '.';
import { RootState } from './redux/store';
import { GroupInformationProvider } from './components/groups/GroupInformation';
import { DrinkListScreenProvider } from './components/drinkList/DrinkListScreen';
import FeatureNotAvailable from './components/FeatureNotAvailable';
import { SubscriptionHandler } from './components/SubscriptionHandler';
import { KeyHolderScreenProvider } from './components/KeyHolderScreen';
import { fetchAdminUsersAsync } from './redux/adminUserSlice';
import { useDependency } from './hooks/useDependency';
import { IAdminUsersRepository } from './repository/IAdminUsersRepository';
import OneSignal from 'react-onesignal';

const App = () => {

  const { isUpdateAvailable, updateAssets } = useServiceWorker();
  const dispatch = useAppDispatch();
  const repository = useDependency<IAdminUsersRepository>("IAdminUsersRepository");
  const { appUpdateAvailable } = useSelector((state: RootState) => state.application);

  useEffect(() => {
    dispatch(onAppUpdateAvailableChange(isUpdateAvailable));
  }, [isUpdateAvailable, dispatch]);

  useEffect(() => {
    OneSignal.init({
      appId: "29f88fe6-c955-493f-8de5-065263af3e23",
      allowLocalhostAsSecureOrigin: true,
    }).then(() => {
      OneSignal.Slidedown.promptPush();
    });
  }, []);

  useEffect(() => {
    if (repository)
      dispatch(fetchAdminUsersAsync(repository));
  }, [dispatch, repository]);

  if (appUpdateAvailable)
    return <UpdateAvailable update={updateAssets} />

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
