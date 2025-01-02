import * as React from 'react';
import * as Sentry from '@sentry/react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Browse from './components/Browse';
import { LoadingScreen } from './components/LoadingScreen';
import UpdateAvailable from './components/UpdateAvailable';
import { UserScreenProvider } from './components/User';
import BrowseAdmin from './features/admin/BrowseAdmin';
import { useServiceWorker } from './hooks/useServiceWorker';
import NotificationsScreenProvider from './features/notifications/NotificationsScreen';
import NotVerifiedScreen from './components/NotVerifiedScreen';
import { AuthGate } from './features/auth/AuthGate';
import { SupabaseClient } from './components/SupabaseClient';
import { SupabaseQueryClient } from './components/SupabaseQueryClient';
import { RecurringEventsProvider } from './features/events/RecurringEvents';
import { PermissionList } from './features/admin/PermissionList';
import { InitialFetch } from './components/InitialFetch';
import { Error } from './components/Error';

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
  console.log('App');
  const { isUpdateAvailable, updateServiceWorker } = useServiceWorker();

  if (isUpdateAvailable) return <UpdateAvailable update={updateServiceWorker} />;

  return (
    <Sentry.ErrorBoundary fallback={<Error message={'Es ist ein Fehler aufgetreten'} />} showDialog>
      <BrowserRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
      >
        <AuthGate>
          <InitialFetch>
            <React.Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route index path="/" element={<Navigate replace to={`/training/list`} />} />

                <Route path="/not-verified" element={<NotVerifiedScreen />} />

                <Route path="/feature-not-available" element={<FeatureNotAvailable />} />

                <Route path="/reset-password" element={<ResetPasswordScreen />} />

                <Route path="/browse" element={<Browse />} />
                <Route path="/browse-admin" element={<BrowseAdmin />} />
                <Route path="/drinks" element={<DrinkListScreenProvider />} />

                <Route path="/history" element={<HistoryScreenProvider />} />
                <Route path="/payments" element={<PayDrinksScreenProvider />} />
                <Route path="/keys" element={<KeyHolderScreenProvider />} />

                <Route path="/notifications" element={<NotificationScreen />} />

                <Route path="/notificationPermissions" element={<NotificationsScreenProvider />} />

                <Route path="user" element={<UserScreenProvider/>}>
                  <Route path=":userId" element={<ProfileScreen />} />
                </Route>

                <Route path="challenges" element={<ChallengeScreen />}>
                  <Route path=":challengeId" element={<ChallengeInfoScreen />} />
                </Route>

                <Route path="trainer">
                  <Route path="groups" element={<ManageGroupsProvider />} />
                  <Route path="groups/:id" element={<GroupInformationProvider />} />
                </Route>

                <Route path="training">
                  <Route path="list" element={<EventScreenProvider />} />
                  <Route path="recurringEvents" element={<RecurringEventsProvider />} />
                  <Route path="event/:selectedEventId" element={<EventInformationProvider />} />
                  <Route path="createOrUpdate/:option" element={<CreateEventProvider />} />
                </Route>

                <Route path="admin">
                  <Route path="drinks" element={<AdminDrinkListProvider />} />
                  <Route path="drinks/history" element={<AdminHistoryScreenProvider />} />
                  <Route path="drinks/payments" element={<PaymentsPendingAdmin />} />
                  <Route path="users" element={<AdminUserListProvider />} />
                  <Route path="supabase" element={<SupabaseClient />} />
                  <Route path="supabase/queries" element={<SupabaseQueryClient />} />
                  <Route path="permissions" element={<PermissionList />} />
                </Route>
                <Route path="*" element={<Navigate replace to={`/training/list`} />} />
              </Routes>
            </React.Suspense>
          </InitialFetch>
        </AuthGate>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  );
};
export default App;
