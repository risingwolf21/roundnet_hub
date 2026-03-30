import { DialogsProvider, NotificationsProvider } from '@toolpad/core';
import { useMemo } from 'react';
import { Navigate, Outlet, RouteObject, RouterProvider, useLocation } from 'react-router';
import ErrorRouteElement from './components/ErrorRouteElement';
import AuthLayout from './components/layout/AuthLayout';
import { MainLayout } from './components/layout/MainLayout';
import { useFeature } from './contexts/FeatureToggleContext';
import { AdminAnalytics } from './features/admin/AdminAnalytics';
import { useApplication } from './features/auth/ApplicationContext';
import { FeatureNotAvailable, PermissionDeniedPage } from './features/auth/ErrorPage';
import { GrantsProvider } from './features/auth/GrantsContext';
import GrantsManager from './features/grants/GrantsManager';
import HomePage from './features/homepage/HomePage';
import UserScreenProvider from './features/profile/UserScreenProvider';
import { lazyWithRetry } from './hooks/lazyWithRetry';
import { Has } from './hooks/useGrants';
import { sentryCreateBrowserRouter } from './instrument';
import { UserWithGroups } from './types/supabaseTypes';

const HistoryScreenProvider = lazyWithRetry(() => import('./features/drinks/HistoryScreen.page'));
const ItemHolderScreen = lazyWithRetry(() => import('./features/keys/ItemHolderScreen'));
const PayDrinksScreenProvider = lazyWithRetry(() => import('./features/drinks/PayDrinks.page'));
const ResetPasswordScreen = lazyWithRetry(() => import('./features/auth/ResetPasswordScreen'));
const PaymentsPendingAdmin = lazyWithRetry(() => import('./features/admin/PaymentsPendingAdmin'));
const AdminDrinkListProvider = lazyWithRetry(() => import('./features/admin/AdminDrinkList'));
const AdminHistoryScreenProvider = lazyWithRetry(() => import('./features/admin/AdminHistoryScreen'));
const AdminUserListProvider = lazyWithRetry(() => import('./features/admin/AdminUserList'));
const DrinkListScreenProvider = lazyWithRetry(() => import('./features/drinks/Drinklist.page'));
const EventInformationProvider = lazyWithRetry(() => import('./features/events/EventInformation.page'));
const EventScreenProvider = lazyWithRetry(() => import('./features/events/EventList.page'));
const NotificationScreen = lazyWithRetry(() => import('./features/notifications/NotificationScreen'));
const ChallengeScreen = lazyWithRetry(() => import('./features/challenges/ChallengeList.page'));
const ChallengeInfoScreen = lazyWithRetry(() => import('./features/challenges/ChallengeInformation'));
const RecurringEvents = lazyWithRetry(() => import('./features/events/RecurringEvents'));
const GameList = lazyWithRetry(() => import('./features/games/GameList'));
const ReportScore = lazyWithRetry(() => import('./features/games/ReportScore'));
const SupabaseClient = lazyWithRetry(() => import('./features/supabase/SupabaseClient'));
const LoginScreen = lazyWithRetry(() => import('./features/auth/LoginScreen'));
const SignUpScreen = lazyWithRetry(() => import('./features/auth/SignUpScreen'));
const ForgotPasswordScreen = lazyWithRetry(() => import('./features/auth/ForgotPasswordScreen'));
const PublicGroupList = lazyWithRetry(() => import('./features/groups/PublicGroupList.page'));
const PublicGroupInformation = lazyWithRetry(() => import('./features/groups/PublicGroupInformation.page'));
const MatchInformation = lazyWithRetry(() => import('./features/games/MatchInformation'));
const SendNotifications = lazyWithRetry(() => import('./features/notifications/SendNotifications'));
const LogsList = lazyWithRetry(() => import('./features/admin/LogsList'));
const AppInformation = lazyWithRetry(() => import('./components/AppInformation'));
const PlayerzoneProfileDialog = lazyWithRetry(() => import('./features/profile/PlayerzoneProfile'));
const NotificationsDialog = lazyWithRetry(() => import('./features/profile/NotificationsDialog'));
const ContactInformation = lazyWithRetry(() => import('./features/profile/ContactInformation'));
const ResetPassword = lazyWithRetry(() => import('./features/profile/ResetPassword'));
const Leaderboard = lazyWithRetry(() => import('./features/games/Leaderboard'));

export const AppRoutes = () => {
  const { user } = useApplication();
  const isShadcnUi = useFeature("enableShadcnUI");

  const router = useMemo(() => createRouter(user, isShadcnUi), [user, isShadcnUi]);

  return <RouterProvider router={router} />;
};

const PrivateRoute = ({ isShadcn = false }: { isShadcn?: boolean }) => {
  const { user } = useApplication();
  const location = useLocation();
  if (!user) return <Navigate to="/auth/login" state={{ path: location.pathname + location.search }} />;

  const privateRoute = <DialogsProvider>
    <NotificationsProvider
      slotProps={{
        snackbar: {
          sx: {
            bottom: 'calc(8px + env(safe-area-inset-bottom))',
          },
        },
      }}
    >
      <Outlet />
    </NotificationsProvider>
  </DialogsProvider>

  if (isShadcn) {
    return <GrantsProvider user={user}>
      <MainLayout>
        {privateRoute}
      </MainLayout>
    </GrantsProvider>
  }
  return <GrantsProvider user={user}>
    {privateRoute}
  </GrantsProvider>
};

const createRouter = (user: UserWithGroups | null, isShadcnUi: boolean) =>
  sentryCreateBrowserRouter([
    {
      path: '/auth',
      element: <AuthLayout />,
      children: [
        {
          path: 'login',
          element: <LoginScreen />,
          errorElement: <ErrorRouteElement />,
        },
        {
          path: 'signup',
          element: <SignUpScreen />,
          errorElement: <ErrorRouteElement />,
        },
        {
          path: 'forgot-password',
          element: <ForgotPasswordScreen />,
          errorElement: <ErrorRouteElement />,
        },
        {
          path: 'reset-password',
          element: <ResetPasswordScreen />,
          errorElement: <ErrorRouteElement />,
        },
      ],
    },
    {
      path: '/',
      element: <PrivateRoute isShadcn={isShadcnUi} />,
      children: [
        {
          path: '',
          errorElement: <ErrorRouteElement isShadcn={isShadcnUi} />,
          children: [
            {
              index: true,
              element: (
                <>
                  {(user?.groups.length ?? 0) > 0 ? (
                    <Navigate to={import.meta.env.VITE_APP_HOMEPAGE ?? '/home'} />
                  ) : (
                    <Navigate to={'/help'} />
                  )}
                </>
              ),
            },
            {
              path: '/help',
              element: <AppInformation />,
            },
            {
              path: '/home',
              element: <HomePage />,
            },
            {
              path: '/reset-password',
              element: <ResetPasswordScreen />,
            },
            {
              path: '/keys',
              element: <ItemHolderScreen />,
            },
            {
              path: '/notifications',
              element: <NotificationScreen />,
            },
            {
              path: '/user',
              element: <Outlet />,
              errorElement: <ErrorRouteElement isShadcn={isShadcnUi} />,
              children: [
                {
                  index: true,
                  element: <UserScreenProvider />,
                },
                {
                  path: 'playerzone',
                  element: <PlayerzoneProfileDialog />,
                },
                {
                  path: 'notifications',
                  element: <NotificationsDialog />,
                },
                {
                  path: 'profile',
                  element: <ContactInformation />,
                },
                {
                  path: 'reset-password',
                  element: <ResetPassword />,
                },
              ],
            },
            {
              path: '/drinks',
              element: (
                <Has feat={'drinks'} fallback={<FeatureNotAvailable />}>
                  <Outlet />
                </Has>
              ),
              errorElement: <ErrorRouteElement isShadcn={isShadcnUi} />,
              children: [
                {
                  index: true,
                  element: <Navigate to="/drinks/list" />,
                },
                {
                  path: 'list',
                  element: <DrinkListScreenProvider />,
                },
                {
                  path: 'history',
                  element: <HistoryScreenProvider />,
                },
                {
                  path: 'payments',
                  element: <PayDrinksScreenProvider />,
                },
              ],
            },
            {
              path: '/challenges',
              element: (
                <Has feat={'challenges'} fallback={<FeatureNotAvailable />}>
                  <Outlet />
                </Has>
              ),
              errorElement: <ErrorRouteElement isShadcn={isShadcnUi} />,
              children: [
                {
                  index: true,
                  element: <Navigate to="/challenges/list" />,
                },
                {
                  path: 'list',
                  element: <ChallengeScreen />,
                },
                {
                  path: ':challengeId',
                  element: <ChallengeInfoScreen />,
                },
              ],
            },
            {
              path: '/groups',
              element: <Outlet />,
              errorElement: <ErrorRouteElement isShadcn={isShadcnUi} />,
              children: [
                {
                  index: true,
                  element: <Navigate to="/groups/list" />,
                },
                {
                  path: 'list',
                  element: <PublicGroupList isShadcn={isShadcnUi} />,
                },
                {
                  path: ':groupId',
                  element: <PublicGroupInformation isShadcn={isShadcnUi} />,
                },
              ],
            },
            {
              path: '/training',
              element: (
                <Has feat={'events'} fallback={<FeatureNotAvailable />}>
                  <Outlet />
                </Has>
              ),
              errorElement: <ErrorRouteElement isShadcn={isShadcnUi} />,
              children: [
                {
                  index: true,
                  element: <Navigate to="/training/list" />,
                },
                {
                  path: 'list',
                  element: <EventScreenProvider isShadcn={isShadcnUi} />,
                },
                {
                  path: 'recurringEvents',
                  element: <RecurringEvents />,
                },
                {
                  path: 'event/:selectedEventId',
                  element: <EventInformationProvider isShadcn={isShadcnUi} />,
                },
              ],
            },
            {
              path: '/matches',
              element: (
                <Has feat={'games'} fallback={<FeatureNotAvailable />}>
                  <Outlet />
                </Has>
              ),
              errorElement: <ErrorRouteElement isShadcn={isShadcnUi} />,
              children: [
                {
                  index: true,
                  element: <Navigate to="/matches/list" />,
                },
                {
                  path: 'list',
                  element: <GameList />,
                },
                {
                  path: 'report',
                  element: <ReportScore />,
                },
                {
                  path: ':matchId',
                  element: <MatchInformation />,
                },
                {
                  path: 'leaderboard',
                  element: <Leaderboard />,
                }
              ],
            },
            {
              path: '/admin',
              element: <Outlet />,
              errorElement: <ErrorRouteElement isShadcn={isShadcnUi} />,
              children: [
                {
                  path: 'drinks',
                  element: <AdminDrinkListProvider />,
                },
                {
                  path: 'drinks/history',
                  element: <AdminHistoryScreenProvider />,
                },
                {
                  path: 'drinks/payments',
                  element: <PaymentsPendingAdmin />,
                },
                {
                  path: 'users',
                  element: <AdminUserListProvider />,
                },
                {
                  path: 'analytics',
                  element: <AdminAnalytics />
                },
                {
                  path: 'notify_users',
                  element: (
                    <Has perm={'admin.notify_users'} fallback={<PermissionDeniedPage />}>
                      <SendNotifications />
                    </Has>
                  ),
                },
                {
                  path: 'audit/logs',
                  element: (
                    <Has perm={'supabase.admin'} fallback={<PermissionDeniedPage />}>
                      <LogsList />
                    </Has>
                  ),
                },
                {
                  path: 'supabase',
                  element: (
                    <Has perm={'supabase.admin'} fallback={<PermissionDeniedPage />}>
                      <SupabaseClient />
                    </Has>
                  ),
                },
                {
                  path: 'grants',
                  element: (
                    <Has perm={'grants.manage'}>
                      <GrantsManager />
                    </Has>
                  ),
                },
              ],
            },
            {
              path: '*',
              element: <Navigate to="/" replace />,
            },
          ],
        },
      ],
    },
  ] as RouteObject[]);
