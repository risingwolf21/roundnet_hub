import {Container, Grid, Typography} from "@mui/material";
import * as React from 'react';
import {BrowserRouter, Navigate, Route} from 'react-router-dom';
import CustomBottomNavigation from './components/BottomNavigation';
import Browse from './components/Browse';
import {LoadingScreen} from "./components/LoadingScreen";
import UpdateAvailable from './components/UpdateAvailable';
import {UserScreenProvider} from './components/User';
import BrowseAdmin from './components/admin/BrowseAdmin';
import {useServiceWorker} from './hooks/useServiceWorker';
import NotificationsScreenProvider from "./components/NotificationsScreen";
import {useInitialFetch} from "./components/InitialFetch";
import NotVerifiedScreen from "./components/NotVerifiedScreen";
import {AuthGate} from "./components/AuthGate";
import {SupabaseClient} from "./components/SupabaseClient";
import {SentryRoutes} from "./index";
import {HOMEPAGE} from "./constants";
import {FirebaseMessaging} from "./components/FirebaseMessaging";

const FeatureNotAvailable = React.lazy(() => import('./components/FeatureNotAvailable'));
const HistoryScreenProvider = React.lazy(() => import('./components/HistoryScreen'));
const KeyHolderScreenProvider = React.lazy(() => import('./components/keys/KeyHolderScreen'));
const PayDrinksScreenProvider = React.lazy(() => import('./components/PayDrinksScreen'));
const ResetPasswordScreen = React.lazy(() => import('./components/ResetPasswordScreen'));
const PaymentsPendingAdmin = React.lazy(() => import('./components/admin/PaymentsPendingAdmin'));
const CreateEventProvider = React.lazy(() => import('./components/eventCreation/provider'));
const AdminDrinkListProvider = React.lazy(() => import('./components/admin/AdminDrinkList'));
const AdminHistoryScreenProvider = React.lazy(() => import('./components/admin/AdminHistoryScreen'));
const AdminUserListProvider = React.lazy(() => import('./components/admin/AdminUserList'));
const DrinkListScreenProvider = React.lazy(() => import('./components/drinkList/provider'));
const GroupInformationProvider = React.lazy(() => import('./components/groups/GroupInformation'));
const ManageGroupsProvider = React.lazy(() => import('./components/groups/ManageGroups'));
const EventInformationProvider = React.lazy(() => import('./components/eventInformation/provider'));
const EventScreenProvider = React.lazy(() => import('./components/eventList/provider'));
const ProfileScreen = React.lazy(() => import('./components/Profile'));
const NotificationScreen = React.lazy(() => import('./components/notifications/NotificationScreen'));

const App = () => {

       useInitialFetch();
       const { isUpdateAvailable, updateServiceWorker } = useServiceWorker();

       if (isUpdateAvailable)
              return <UpdateAvailable update={updateServiceWorker} />

       return <Grid maxHeight={"100vh"}>
              {
                     process.env.REACT_APP_ENV !== "production" && <Container
                            style={{ height: "24px", width: "100%", textAlign: "center", maxWidth: "none", background: "#eee" }}>
                            <Typography>{process.env.REACT_APP_ENV}</Typography>
                     </Container>
              }
              <BrowserRouter>
                     <AuthGate>
                            <FirebaseMessaging>
                                   <React.Suspense fallback={<LoadingScreen />}>
                                          <SentryRoutes>
                                                 <Route path='/' element={<Navigate replace to={`/${HOMEPAGE}`} />} />
                                                 <Route path='*' element={<Navigate replace to={`/${HOMEPAGE}`} />} />

                                                 <Route path='/reset-password' element={<ResetPasswordScreen />} />
                                                 <Route path='/not-verified' element={<NotVerifiedScreen />} />

                                                 <Route path='/feature-not-available' element={<FeatureNotAvailable />} />

                                                 <Route path='/reset-password' element={<ResetPasswordScreen />} />

                                                 <Route path='/browse' element={<Browse />} />
                                                 <Route path='/browse-admin' element={<BrowseAdmin />} />
                                                 <Route path="/drinks" element={<DrinkListScreenProvider />} />
                                                 <Route path="/user"
                                                        element={<UserScreenProvider />} />
                                                 <Route path="/user/:userId"
                                                        element={<ProfileScreen />} />
                                                 <Route path="/history"
                                                        element={<HistoryScreenProvider />} />
                                                 <Route path="/payments"
                                                        element={<PayDrinksScreenProvider />} />
                                                 <Route path="/keys"
                                                        element={<KeyHolderScreenProvider />} />

                                                 <Route path="/notifications"
                                                        element={<NotificationScreen />} />

                                                 <Route path="/notificationPermissions"
                                                        element={<NotificationsScreenProvider />} />

                                                 <Route path="/trainer/groups"
                                                        element={<ManageGroupsProvider />} />
                                                 <Route path="/trainer/groups/:id"
                                                        element={<GroupInformationProvider />} />
                                                 <Route path="/training" element={<EventScreenProvider />} />
                                                 <Route path="/training/event/:selectedEventId"
                                                        element={<EventInformationProvider />} />
                                                 <Route path="/training/createOrUpdate/:option"
                                                        element={<CreateEventProvider />} />
                                                 <Route path='/admin/drinks'
                                                        element={<AdminDrinkListProvider />} />
                                                 <Route path="/admin/drinks/history"
                                                        element={<AdminHistoryScreenProvider />} />
                                                 <Route path='/admin/drinks/payments'
                                                        element={<PaymentsPendingAdmin />} />
                                                 <Route path='/admin/users' element={<AdminUserListProvider />} />
                                                 <Route path='/admin/supabase' element={<SupabaseClient />} />
                                          </SentryRoutes>
                                   </React.Suspense>
                                   <div style={{ width: "100%", height: "56px" }} />
                                   <CustomBottomNavigation />
                            </FirebaseMessaging>
                     </AuthGate>
              </BrowserRouter>
       </Grid>
}
export default App;
