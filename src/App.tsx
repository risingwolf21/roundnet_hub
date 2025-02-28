import { CssBaseline } from '@mui/material';
import * as Sentry from '@sentry/react';
import * as React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { FallbackComponent } from './components/Error';
import { LoadingScreen } from './components/LoadingScreen';
import AuthCallback from './features/auth/AuthCallback';
import { AuthGate } from './features/auth/AuthGate';
import ForgotPasswordScreen from './features/auth/ForgotPasswordScreen';
import LoginScreen from './features/auth/LoginScreen';
import { ProtectedLayout } from './features/auth/ProtectedRoute';
import RegisterScreen from './features/auth/RegisterScreen';
import { useServiceWorker } from './hooks/useServiceWorker';
import { DataProtection } from './components/DataProtection';
import raw from './git_commit.txt';
import UpdateAvailable from './components/UpdateAvailable';

const App = () => {
  const { isUpdateAvailable, updateServiceWorker } = useServiceWorker();
  const [version, setVersion] = React.useState("");

  React.useEffect(() => {
    fetch(raw)
      .then((r) => r.text())
      .then((text) => {
        setVersion(text);
      });
  }, []);

  if (isUpdateAvailable) return <UpdateAvailable update={updateServiceWorker} />;

  // return (
  // <Sentry.ErrorBoundary
  //   onError={console.error}
  //   fallback={({ resetError, error }) => (
  //     <FallbackComponent message={'Es ist ein Fehler aufgetreten. ' + JSON.stringify(error)} resetError={resetError} />
  //   )}
  // >
  //   <CssBaseline />
  //   <BrowserRouter
  //     future={{
  //       v7_relativeSplatPath: true,
  //       v7_startTransition: true,
  //     }}
  //   >
  //     <AuthGate version={version}>
  //       <React.Suspense fallback={<LoadingScreen />}>
  //         <Routes>

  //           <Route path="/data-protection" element={<DataProtection />} />

  //           <Route path="/login" element={<LoginScreen />} />
  //           <Route path="/register" element={<RegisterScreen />} />
  //           <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
  //           <Route path="/auth/callback" element={<AuthCallback />} />

  //           <Route element={<ProtectedLayout />}>
  //             <Route index path="/home" element={<HomePage />} />

  //             <Route path="/not-verified" element={<NotVerifiedScreen />} />

  //             <Route path="/feature-not-available" element={<FeatureNotAvailable />} />

  //             <Route path="/reset-password" element={<ResetPasswordScreen />} />

  //             <Route path="/drinks" element={<DrinkListScreenProvider />} />
  //             <Route path="/history" element={<HistoryScreenProvider />} />
  //             <Route path="/payments" element={<PayDrinksScreenProvider />} />
  //             <Route path="/keys" element={<KeyHolderScreenProvider />} />

  //             <Route path="/notifications" element={<NotificationScreen />} />

  //             <Route path="user">
  //               <Route index element={<UserScreenProvider />} />
  //               <Route path=":userId" element={<ProfileScreen />} />
  //             </Route>

  //             <Route path="challenges">
  //               <Route index element={<ChallengeScreen />} />
  //               <Route path=":challengeId" element={<ChallengeInfoScreen />} />
  //             </Route>

  //             <Route path="trainer">
  //               <Route path="groups" element={<ManageGroupsProvider />} />
  //               <Route path="groups/:id" element={<GroupInformationProvider />} />
  //             </Route>

  //             <Route path="training">
  //               <Route path="list" element={<EventScreenProvider />} />
  //               <Route path="recurringEvents" element={<RecurringEvents />} />
  //               <Route path="event/:selectedEventId" element={<EventInformationProvider />} />
  //               <Route path="createOrUpdate/:option" element={<CreateEventProvider />} />
  //             </Route>

  //             <Route path="matches">
  //               <Route index element={<GameList />} />
  //               <Route path="report" element={<ReportScore />} />
  //             </Route>

  //             <Route path="admin">
  //               <Route path="drinks" element={<AdminDrinkListProvider />} />
  //               <Route path="drinks/history" element={<AdminHistoryScreenProvider />} />
  //               <Route path="drinks/payments" element={<PaymentsPendingAdmin />} />
  //               <Route path="users" element={<AdminUserListProvider />} />
  //               <Route path="supabase" element={<SupabaseClient />} />
  //               <Route path="permissions" element={<PermissionList />} />
  //             </Route>
  //           </Route>
  //           <Route path="*" element={<Navigate to="/login" replace />} />
  //         </Routes>
  //       </React.Suspense>
  //     </AuthGate>
  //   </BrowserRouter>
  // </Sentry.ErrorBoundary>
  // );
};
export default App;
