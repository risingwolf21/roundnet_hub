import { DialogsProvider, NotificationsProvider } from '@toolpad/core';
import { useMemo } from 'react';
import { Navigate, Outlet, RouteObject, RouterProvider, useLocation } from 'react-router';
import ErrorRouteElement from './components/ErrorRouteElement';
import { useFeature } from './contexts/FeatureToggleContext';
import { useApplication } from './features/auth/ApplicationContext';
import { FeatureNotAvailable, PermissionDeniedPage } from './features/auth/ErrorPage';
import ForgotPasswordShadcn from './features/auth/ForgotPassword.shadcn';
import { GrantsProvider } from './features/auth/GrantsContext';
import LoginFormShadcn from './features/auth/LoginForm.shadcn';
import SignUpFormShadcn from './features/auth/SignUpForm.shadcn';
import HomePage from './features/homepage/HomePage';
import UserScreenProvider from './features/profile/UserScreenProvider';
import { Has } from './hooks/useGrants';
import { sentryCreateBrowserRouter } from './instrument';
import { UserWithGroups } from './types/supabaseTypes';

import * as Pages from "./routes/lazy-components";

export const AppRoutes = () => {
  const { user } = useApplication();
  const isShadcnUi = useFeature("shadcnUI");

  const router = useMemo(() => createRouter(user, isShadcnUi), [user, isShadcnUi]);

  return <RouterProvider router={router} />;
};

const PrivateRoute = ({ isShadcn = false }: { isShadcn?: boolean }) => {
  const { user } = useApplication();
  const location = useLocation();
  if (!user) return <Navigate to="/auth/login" state={{ path: location.pathname + location.search }} />;

  const privateRoute = <DialogsProvider>
    <Pages.DialogsProvider>
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
    </Pages.DialogsProvider>
  </DialogsProvider>

  if (isShadcn) {
    return <GrantsProvider user={user}>
      <Pages.MainLayout>
        {privateRoute}
      </Pages.MainLayout>
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
      element: isShadcnUi ? <Pages.AuthLayoutShadcn /> : <Pages.AuthLayout />,
      children: [
        {
          path: 'login',
          element: isShadcnUi ? <LoginFormShadcn /> : <Pages.LoginScreen />,
          errorElement: <ErrorRouteElement />,
        },
        {
          path: 'signup',
          element: isShadcnUi ? <SignUpFormShadcn /> : <Pages.SignUpScreen />,
          errorElement: <ErrorRouteElement />,
        },
        {
          path: 'forgot-password',
          element: isShadcnUi ? <ForgotPasswordShadcn /> : <Pages.ForgotPasswordScreen />,
          errorElement: <ErrorRouteElement />,
        },
        {
          path: 'reset-password',
          element: <Pages.ResetPasswordScreen />,
          errorElement: <ErrorRouteElement />,
        },
      ],
    },
    {
      path: '/',
      element: <PrivateRoute isShadcn={isShadcnUi} />,
      errorElement: <ErrorRouteElement isShadcn={isShadcnUi} />,
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
              element: isShadcnUi ? <Pages.AppInformationShadcn /> : <Pages.AppInformation />,
            },
            {
              path: '/home',
              element: isShadcnUi ? <Pages.HomePageShadcn /> : <HomePage />,
            },
            {
              path: '/keys',
              element: isShadcnUi ? <Pages.ItemHolderScreenShadcn /> : <Pages.ItemHolderScreen />,
            },
            {
              path: '/notifications',
              element: <Pages.NotificationScreen isShadcn={isShadcnUi} />,
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
                  element: <Pages.PlayerzoneProfileDialog />,
                },
                {
                  path: 'notifications',
                  element: <Pages.NotificationsDialog />,
                },
                {
                  path: 'profile',
                  element: <Pages.ContactInformation />,
                },
                {
                  path: 'reset-password',
                  element: <Pages.ResetPassword />,
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
                  element: <Pages.DrinkListScreenProvider isShadcn={isShadcnUi} />,
                },
                {
                  path: 'history',
                  element: <Pages.HistoryScreenProvider isShadcn={isShadcnUi} />,
                },
                {
                  path: 'payments',
                  element: <Pages.PayDrinksScreenProvider isShadcn={isShadcnUi} />,
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
                  element: isShadcnUi ? <Pages.ChallengeListShadcn /> : <Pages.ChallengeScreen />,
                },
                {
                  path: ':challengeId',
                  element: <Pages.ChallengeInfoScreen isShadcn={isShadcnUi} />,
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
                  element: <Pages.PublicGroupList isShadcn={isShadcnUi} />,
                },
                {
                  path: ':groupId',
                  element: <Pages.PublicGroupInformation isShadcn={isShadcnUi} />,
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
                  element: <Pages.EventScreenProvider isShadcn={isShadcnUi} />,
                },
                {
                  path: 'recurringEvents',
                  element: isShadcnUi ? <Pages.RecurringEventsShadcn /> : <Pages.RecurringEvents />,
                },
                {
                  path: 'event/:selectedEventId',
                  element: <Pages.EventInformationProvider isShadcn={isShadcnUi} />,
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
                  element: isShadcnUi ? <Pages.GameListShadcn /> : <Pages.GameList />,
                },
                {
                  path: 'report',
                  element: <Pages.ReportScore />,
                },
                {
                  path: ':matchId',
                  element: isShadcnUi ? <Pages.MatchInformationShadcn /> : <Pages.MatchInformation />,
                },
                {
                  path: 'leaderboard',
                  element: isShadcnUi ? <Pages.LeaderboardShadcn /> : <Pages.Leaderboard />,
                }
              ],
            },
            {
              path: '/supabase',
              errorElement: <ErrorRouteElement isShadcn={isShadcnUi} />,
              children: [
                {
                  path: 'logs',
                  element: (
                    <Has perm={'supabase.admin'} fallback={<PermissionDeniedPage />}>
                      <Pages.LogsManager />
                    </Has >
                  ),
                },
                {
                  path: 'database',
                  element: (
                    <Has perm={'supabase.admin'} fallback={<PermissionDeniedPage />}>
                      <Pages.DatabaseManager />
                    </Has>
                  ),
                }
              ]
            },
            {
              path: '/admin',
              element: <Outlet />,
              errorElement: <ErrorRouteElement isShadcn={isShadcnUi} />,
              children: [
                {
                  path: 'drinks',
                  element: <Pages.AdminDrinkListProvider />,
                },
                {
                  path: 'drinks/history',
                  element: isShadcnUi ? <Pages.AdminHistoryScreenShadcn /> : <Pages.AdminHistoryScreenProvider />,
                },
                {
                  path: 'drinks/payments',
                  element: isShadcnUi ? <Pages.PaymentsPendingAdminShadcn /> : <Pages.PaymentsPendingAdmin />,
                },
                {
                  path: 'users',
                  element: isShadcnUi ? <Pages.AdminUserList /> : <Pages.AdminUserListProvider />,
                },
                {
                  path: 'analytics',
                  element: isShadcnUi ? <Pages.AdminAnalyticsShadcn /> : <Pages.AdminAnalytics />
                },
                {
                  path: 'grants',
                  element: (
                    <Has perm={'grants.manage'}>
                      {
                        isShadcnUi ? <Pages.GrantsManagerShadcn /> : <Pages.GrantsManager />
                      }
                    </Has>
                  ),
                },
                {
                  path: 'merge_accounts',
                  element: <Pages.UserPlayerMappingShadcn />
                }
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
