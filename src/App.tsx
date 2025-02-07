import { CssBaseline } from '@mui/material';
import * as Sentry from '@sentry/react';
import * as React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { FallbackComponent } from './components/Error';
import { InitialFetch } from './components/InitialFetch';
import { LoadingScreen } from './components/LoadingScreen';
import { SentryIssueList } from './features/admin/SentryIssues';
import { AuthGate } from './features/auth/AuthGate';
import { useServiceWorker } from './hooks/useServiceWorker';

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
const RecurringEvents = React.lazy(() => import('./features/events/RecurringEvents'));
const GameList = React.lazy(() => import('./features/games/GameList'));
const ReportScore = React.lazy(() => import('./features/games/ReportScore'));
const UpdateAvailable = React.lazy(() => import('./components/UpdateAvailable'));
const NotVerifiedScreen = React.lazy(() => import('./components/NotVerifiedScreen'));
const HomePage = React.lazy(() => import('./features/homepage/HomePage'));
const SupabaseClient = React.lazy(() => import('./components/SupabaseClient'));
const SupabaseQueryClient = React.lazy(() => import('./components/SupabaseQueryClient'));
const UserScreenProvider = React.lazy(() => import('./components/User'));
const PermissionList = React.lazy(() => import('./features/admin/PermissionList'));

const App = () => {
  const { isUpdateAvailable, updateServiceWorker } = useServiceWorker();

  if (isUpdateAvailable) return <UpdateAvailable update={updateServiceWorker} />;

  return (
    <Sentry.ErrorBoundary
      onError={console.error}
      fallback={({ resetError }) => (
        <FallbackComponent message={'Es ist ein Fehler aufgetreten'} resetError={resetError} />
      )}
    >
      <CssBaseline />
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
                <Route index path="/" element={<HomePage />} />

                <Route path="/not-verified" element={<NotVerifiedScreen />} />

                <Route path="/feature-not-available" element={<FeatureNotAvailable />} />

                <Route path="/reset-password" element={<ResetPasswordScreen />} />

                <Route path="/drinks" element={<DrinkListScreenProvider />} />
                <Route path="/history" element={<HistoryScreenProvider />} />
                <Route path="/payments" element={<PayDrinksScreenProvider />} />
                <Route path="/keys" element={<KeyHolderScreenProvider />} />

                <Route path="/notifications" element={<NotificationScreen />} />

                <Route path="user">
                  <Route index element={<UserScreenProvider />} />
                  <Route path=":userId" element={<ProfileScreen />} />
                </Route>

                <Route path="challenges">
                  <Route index element={<ChallengeScreen />} />
                  <Route path=":challengeId" element={<ChallengeInfoScreen />} />
                </Route>

                <Route path="trainer">
                  <Route path="groups" element={<ManageGroupsProvider />} />
                  <Route path="groups/:id" element={<GroupInformationProvider />} />
                </Route>

                <Route path="training">
                  <Route path="list" element={<EventScreenProvider />} />
                  <Route path="recurringEvents" element={<RecurringEvents />} />
                  <Route path="event/:selectedEventId" element={<EventInformationProvider />} />
                  <Route path="createOrUpdate/:option" element={<CreateEventProvider />} />
                </Route>

                <Route path="matches">
                  <Route index element={<GameList />} />
                  <Route path="report" element={<ReportScore />} />
                </Route>

                <Route path="admin">
                  <Route path="drinks" element={<AdminDrinkListProvider />} />
                  <Route path="drinks/history" element={<AdminHistoryScreenProvider />} />
                  <Route path="drinks/payments" element={<PaymentsPendingAdmin />} />
                  <Route path="users" element={<AdminUserListProvider />} />
                  <Route path="supabase" element={<SupabaseClient />} />
                  <Route path="supabase/queries" element={<SupabaseQueryClient />} />
                  <Route path="permissions" element={<PermissionList />} />
                  <Route path="sentry-issues" element={<SentryIssueList />} />
                </Route>
                <Route path="*" element={<Navigate replace to={`/training/list`} />} />
                <Route path="" element={<Navigate replace to={`/training/list`} />} />
              </Routes>
            </React.Suspense>
          </InitialFetch>
        </AuthGate>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  );
};
export default App;
