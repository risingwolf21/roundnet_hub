import { Grid } from "@mui/material";
import * as React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthGate from './AuthGate';
import CustomBottomNavigation from './components/BottomNavigation';
import Browse from './components/Browse';
import { LoadingScreen } from "./components/LoadingScreen";
import UpdateAvailable from './components/UpdateAvailable';
import UserScreen from './components/User';
import BrowseAdmin from './components/admin/BrowseAdmin';
import { useInitialFetch } from "./hooks/useInitialFetch";
import { useOneSignal } from "./hooks/useOneSignal";
import { useServiceWorker } from './hooks/useServiceWorker';
import ExecuteEdgeFunctions from "./components/admin/ExecuteEdgeFunctions";
import NotificationsScreenProvider from "./components/NotificationsScreen";

const FeatureNotAvailable = React.lazy(() => import('./components/FeatureNotAvailable'));
const HistoryScreenProvider = React.lazy(() => import('./components/HistoryScreen'));
const KeyHolderScreenProvider = React.lazy(() => import('./components/KeyHolderScreen'));
const PayDrinksScreenProvider = React.lazy(() => import('./components/PayDrinksScreen'));
const ResetPasswordScreen = React.lazy(() => import('./components/ResetPasswordScreen'));
const PaymentsPendingAdmin = React.lazy(() => import('./components/admin/PaymentsPendingAdmin'));
const DrinkStockUpdateScreen = React.lazy(() => import('./components/procure/DrinkStockUpdateScreen'));
const CreateEventProvider = React.lazy(() => import('./components/eventCreation/provider'));
const AdminDrinkListProvider = React.lazy(() => import('./components/admin/AdminDrinkList'));
const AdminHistoryScreenProvider = React.lazy(() => import('./components/admin/AdminHistoryScreen'));
const AdminUserListProvider = React.lazy(() => import('./components/admin/AdminUserList'));
const DrinkListScreenProvider = React.lazy(() => import('./components/drinkList/provider'));
const GroupInformationProvider = React.lazy(() => import('./components/groups/GroupInformation'));
const ManageGroupsProvider = React.lazy(() => import('./components/groups/ManageGroups'));
const AnalyzeDrinkStockHistoryProvider = React.lazy(() => import('./components/procure/AnalyzeDrinkStockHistory'));
const EventInformationProvider = React.lazy(() => import('./components/eventInformation/provider'));
const EventScreenProvider = React.lazy(() => import('./components/eventList/provider'));

const App = () => {

  useOneSignal();
  useInitialFetch();

  const { isUpdateAvailable, updateServiceWorker } = useServiceWorker();

  if (isUpdateAvailable)
    return <UpdateAvailable update={updateServiceWorker} />

  return <Grid maxHeight={"100vh"}>
    <BrowserRouter>
      <AuthGate>
        <React.Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* <Route path='/' element={<Navigate replace to={"/drinks"} />} />
            <Route path="*" element={<Navigate replace to={"/drinks"} />} /> */}

            <Route path='/feature-not-available' element={<FeatureNotAvailable />} />

            <Route path='/reset-password' element={<ResetPasswordScreen />} />

            <Route path='/browse' element={<Browse />} />
            <Route path='/browse-admin' element={<BrowseAdmin />} />
            <Route path="/drinks" element={<DrinkListScreenProvider />} />
            <Route path="/user" element={<UserScreen />} />
            <Route path="/history" element={<HistoryScreenProvider />} />
            <Route path="/payments" element={<PayDrinksScreenProvider />} />
            <Route path="/keys" element={<KeyHolderScreenProvider />} />
            <Route path="/notifications" element={<NotificationsScreenProvider />} />

            <Route path="/trainer/groups" element={<ManageGroupsProvider />} />
            <Route path="/trainer/groups/:id" element={<GroupInformationProvider />} />
            <Route path="/training" element={<EventScreenProvider />} />
            <Route path="/training/event/:selectedEventId" element={<EventInformationProvider />} />
            <Route path="/training/createOrUpdate/:option" element={<CreateEventProvider />} />

            <Route path='/admin/drinks' element={<AdminDrinkListProvider />} />

            <Route path="/admin/drinks/history" element={<AdminHistoryScreenProvider />} />
            <Route path='/admin/drinks/payments' element={<PaymentsPendingAdmin />} />
            <Route path='/admin/drinks/stocks' element={<DrinkStockUpdateScreen />} />
            <Route path='/admin/drinks/analyze' element={<AnalyzeDrinkStockHistoryProvider />} />
            <Route path='/admin/users' element={<AdminUserListProvider />} />
            <Route path='/admin/edgeFunctions' element={<ExecuteEdgeFunctions />} />
          </Routes>
        </React.Suspense>
        <div style={{ width: "100%", height: "56px" }} />
        <CustomBottomNavigation />
      </AuthGate>
    </BrowserRouter>
  </Grid>
}
export default App;
