import {Grid} from "@mui/material";
import * as React from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import AuthScreen from './components/AuthScreen';
import CustomBottomNavigation from './components/BottomNavigation';
import Browse from './components/Browse';
import {LoadingScreen} from "./components/LoadingScreen";
import UpdateAvailable from './components/UpdateAvailable';
import {UserScreenProvider} from './components/User';
import BrowseAdmin from './components/admin/BrowseAdmin';
import {useOneSignal} from "./hooks/useOneSignal";
import {useServiceWorker} from './hooks/useServiceWorker';
import ExecuteEdgeFunctions from "./components/admin/ExecuteEdgeFunctions";
import NotificationsScreenProvider from "./components/NotificationsScreen";
import {useInitialFetch} from "./components/InitialFetch";
import NotVerifiedScreen from "./components/NotVerifiedScreen";
import LoginScreen from "./components/LoginScreen";
import RegisterScreen from "./components/RegisterScreen";
import ForgotPasswordScreen from "./components/ForgotPasswordScreen";
import ProtectedRoute from "./components/ProtectedRoute";
import {AuthStateListener} from "./components/AuthStateListener";

const FeatureNotAvailable = React.lazy(() => import('./components/FeatureNotAvailable'));
const HistoryScreenProvider = React.lazy(() => import('./components/HistoryScreen'));
const KeyHolderScreenProvider = React.lazy(() => import('./components/keys/KeyHolderScreen'));
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
const ProfileScreen = React.lazy(() => import('./components/Profile'));

const App = () => {

    useOneSignal();
    useInitialFetch();

    const {isUpdateAvailable, updateServiceWorker} = useServiceWorker();

    if (isUpdateAvailable)
        return <UpdateAvailable update={updateServiceWorker}/>

    return <Grid maxHeight={"100vh"}>
        <BrowserRouter>
            <AuthStateListener>
                <React.Suspense fallback={<LoadingScreen/>}>
                    <Routes>
                        <Route path='/' element={<Navigate replace to={"/drinks"}/>}/>
                        <Route path='*' element={<Navigate replace to={"/drinks"}/>}/>

                        <Route path='/auth' element={<AuthScreen/>}/>
                        <Route path='/reset-password' element={<ResetPasswordScreen/>}/>
                        <Route path='/not-verified' element={<NotVerifiedScreen/>}/>

                        <Route path='/feature-not-available' element={<FeatureNotAvailable/>}/>

                        <Route path='/reset-password' element={<ResetPasswordScreen/>}/>

                        <Route path='/browse' element={<Browse/>}/>
                        <Route path='/browse-admin' element={<BrowseAdmin/>}/>
                        <Route path="/drinks" element={<ProtectedRoute><DrinkListScreenProvider/></ProtectedRoute>}/>
                        <Route path="/user"
                               element={<ProtectedRoute><UserScreenProvider/></ProtectedRoute>}/>
                        <Route path="/user/:userId"
                               element={<ProtectedRoute><ProfileScreen/></ProtectedRoute>}/>
                        <Route path="/history"
                               element={<ProtectedRoute><HistoryScreenProvider/></ProtectedRoute>}/>
                        <Route path="/payments"
                               element={<ProtectedRoute><PayDrinksScreenProvider/></ProtectedRoute>}/>
                        <Route path="/keys"
                               element={<ProtectedRoute><KeyHolderScreenProvider/></ProtectedRoute>}/>

                        <Route path="/notifications"
                               element={<ProtectedRoute><NotificationsScreenProvider/></ProtectedRoute>}/>

                        <Route path="/trainer/groups"
                               element={<ProtectedRoute><ManageGroupsProvider/></ProtectedRoute>}/>
                        <Route path="/trainer/groups/:id"
                               element={<ProtectedRoute><GroupInformationProvider/></ProtectedRoute>}/>
                        <Route path="/training" element={<ProtectedRoute><EventScreenProvider/></ProtectedRoute>}/>
                        <Route path="/training/event/:selectedEventId"
                               element={<ProtectedRoute><EventInformationProvider/></ProtectedRoute>}/>
                        <Route path="/training/createOrUpdate/:option"
                               element={<ProtectedRoute><CreateEventProvider/></ProtectedRoute>}/>
                        <Route path='/admin/drinks'
                               element={<ProtectedRoute><AdminDrinkListProvider/></ProtectedRoute>}/>
                        <Route path="/admin/drinks/history"
                               element={<ProtectedRoute><AdminHistoryScreenProvider/></ProtectedRoute>}/>
                        <Route path='/admin/drinks/payments'
                               element={<ProtectedRoute><PaymentsPendingAdmin/></ProtectedRoute>}/>
                        <Route path='/admin/drinks/stocks'
                               element={<ProtectedRoute><DrinkStockUpdateScreen/></ProtectedRoute>}/>
                        <Route path='/admin/drinks/analyze'
                               element={<ProtectedRoute><AnalyzeDrinkStockHistoryProvider/></ProtectedRoute>}/>
                        <Route path='/admin/users' element={<ProtectedRoute><AdminUserListProvider/></ProtectedRoute>}/>
                        <Route path='/admin/edgeFunctions'
                               element={<ProtectedRoute><ExecuteEdgeFunctions/></ProtectedRoute>}/>
                    </Routes>
                </React.Suspense>
                <div style={{width: "100%", height: "56px"}}/>
                <CustomBottomNavigation/>
            </AuthStateListener>
        </BrowserRouter>
    </Grid>
}
export default App;
