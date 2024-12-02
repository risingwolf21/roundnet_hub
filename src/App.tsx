import {Container, Typography} from "@mui/material";
import * as React from 'react';
import {BrowserRouter, Navigate, Route} from 'react-router-dom';
import Browse from './components/Browse';
import {LoadingScreen} from "./components/LoadingScreen";
import UpdateAvailable from './components/UpdateAvailable';
import {UserScreenProvider} from './components/User';
import BrowseAdmin from './features/admin/BrowseAdmin';
import {useServiceWorker} from './hooks/useServiceWorker';
import NotificationsScreenProvider from "./features/notifications/NotificationsScreen";
import NotVerifiedScreen from "./components/NotVerifiedScreen";
import {AuthGate} from "./features/auth/AuthGate";
import {SupabaseClient} from "./components/SupabaseClient";
import {SupabaseQueryClient} from "./components/SupabaseQueryClient";
import {SentryRoutes} from "./index";
import {HOMEPAGE} from "./constants";
import {FirebaseMessaging} from "./features/notifications/FirebaseMessaging";
import {RecurringEventsProvider} from "./features/events/RecurringEvents";
import Grid from "@mui/material/Grid2";
import {PermissionList} from "./features/admin/PermissionList";

const FeatureNotAvailable = React.lazy(() => import('./components/FeatureNotAvailable'));
const HistoryScreenProvider = React.lazy(() => import('./features/drinks/HistoryScreenProvider'));
const KeyHolderScreenProvider = React.lazy(() => import('./features/keys/provider'));
const PayDrinksScreenProvider = React.lazy(() => import('./features/drinks/PayDrinksScreen'));
const ResetPasswordScreen = React.lazy(() => import('./features/auth/ResetPasswordScreen'));
const PaymentsPendingAdmin = React.lazy(() => import('./features/admin/PaymentsPendingAdmin'));
const CreateEventProvider = React.lazy(() => import('./pages/EventCreation.page'));
const AdminDrinkListProvider = React.lazy(() => import('./features/admin/AdminDrinkList'));
const AdminHistoryScreenProvider = React.lazy(() => import('./features/admin/AdminHistoryScreen'));
const AdminUserListProvider = React.lazy(() => import('./features/admin/AdminUserList'));
const DrinkListScreenProvider = React.lazy(() => import('./pages/Drinklist.page'));
const GroupInformationProvider = React.lazy(() => import('./features/groups/GroupInformation'));
const ManageGroupsProvider = React.lazy(() => import('./features/groups/ManageGroups'));
const EventInformationProvider = React.lazy(() => import('./pages/EventInformation.page'));
const EventScreenProvider = React.lazy(() => import('./pages/EventList.page'));
const ProfileScreen = React.lazy(() => import('./components/Profile'));
const NotificationScreen = React.lazy(() => import('./features/notifications/NotificationScreen'));
const ChallengeScreen = React.lazy(() => import('./features/challenges/ChallengeList'));
const ChallengeInfoScreen = React.lazy(() => import('./features/challenges/ChallengeInformationProvider'));

const App = () => {

    const {isUpdateAvailable, updateServiceWorker} = useServiceWorker();

    if (isUpdateAvailable)
        return <UpdateAvailable update={updateServiceWorker}/>

    return <Grid maxHeight={"100vh"}>
        {
            process.env.REACT_APP_ENV !== "production" && <Container
                style={{height: "24px", width: "100%", textAlign: "center", maxWidth: "none", background: "#eee"}}>
                <Typography>{process.env.REACT_APP_ENV}</Typography>
            </Container>
        }
        <BrowserRouter>
            <AuthGate>
                <FirebaseMessaging>
                    <React.Suspense fallback={<LoadingScreen/>}>
                        <SentryRoutes>
                            <Route path='/' element={<Navigate replace to={`/${HOMEPAGE}`}/>}/>
                            <Route path='*' element={<Navigate replace to={`/${HOMEPAGE}`}/>}/>

                            <Route path='/not-verified' element={<NotVerifiedScreen/>}/>

                            <Route path='/feature-not-available' element={<FeatureNotAvailable/>}/>

                            <Route path='/reset-password' element={<ResetPasswordScreen/>}/>

                            <Route path='/browse' element={<Browse/>}/>
                            <Route path='/browse-admin' element={<BrowseAdmin/>}/>
                            <Route path="/drinks" element={<DrinkListScreenProvider/>}/>
                            <Route path="/user"
                                   element={<UserScreenProvider/>}/>
                            <Route path="/user/:userId"
                                   element={<ProfileScreen/>}/>
                            <Route path="/history"
                                   element={<HistoryScreenProvider/>}/>
                            <Route path="/payments"
                                   element={<PayDrinksScreenProvider/>}/>
                            <Route path="/keys"
                                   element={<KeyHolderScreenProvider/>}/>

                            <Route path="/notifications"
                                   element={<NotificationScreen/>}/>

                            <Route path="/notificationPermissions"
                                   element={<NotificationsScreenProvider/>}/>

                            <Route path="/challenges" element={<ChallengeScreen/>}/>

                            <Route path="/challenges/:challengeId" element={<ChallengeInfoScreen/>}/>

                            <Route path="/trainer/groups"
                                   element={<ManageGroupsProvider/>}/>
                            <Route path="/trainer/groups/:id"
                                   element={<GroupInformationProvider/>}/>
                            <Route path="/training" element={<EventScreenProvider/>}/>
                            <Route path="/training/recurringEvents" element={<RecurringEventsProvider/>}/>
                            <Route path="/training/event/:selectedEventId"
                                   element={<EventInformationProvider/>}/>
                            <Route path="/training/createOrUpdate/:option"
                                   element={<CreateEventProvider/>}/>
                            <Route path='/admin/drinks'
                                   element={<AdminDrinkListProvider/>}/>
                            <Route path="/admin/drinks/history"
                                   element={<AdminHistoryScreenProvider/>}/>
                            <Route path='/admin/drinks/payments'
                                   element={<PaymentsPendingAdmin/>}/>
                            <Route path='/admin/users' element={<AdminUserListProvider/>}/>
                            <Route path='/admin/supabase' element={<SupabaseClient/>}/>
                            <Route path='/admin/supabase/queries' element={<SupabaseQueryClient/>}/>
                            <Route path='/admin/permissions' element={<PermissionList/>}/>
                        </SentryRoutes>
                    </React.Suspense>
                </FirebaseMessaging>
            </AuthGate>
        </BrowserRouter>
    </Grid>
}
export default App;
