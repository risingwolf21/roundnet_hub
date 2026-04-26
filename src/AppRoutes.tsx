import { DialogsProvider, NotificationsProvider } from '@toolpad/core';
import { useMemo } from 'react';
import { Navigate, Outlet, RouteObject, RouterProvider, useLocation } from 'react-router';
import ErrorRouteElement from './components/ErrorRouteElement';
import { useApplication } from './features/auth/ApplicationContext';
import ForgotPasswordShadcn from './features/auth/ForgotPassword.shadcn';
import { GrantsProvider } from './features/auth/GrantsContext';
import LoginFormShadcn from './features/auth/LoginForm.shadcn';
import SignUpFormShadcn from './features/auth/SignUpForm.shadcn';
import { Has } from './hooks/useGrants';
import { sentryCreateBrowserRouter } from './instrument';
import { UserWithGroups } from './types/supabaseTypes';

import FeatureLockedRouteElement from './components/FeatureLockedRouteElement';
import UnauthorizedRouteElement from './components/UnauthorizedRouteElement';
import * as Pages from "./routes/lazy-components";

export const AppRoutes = () => {
  const { user } = useApplication();

  const router = useMemo(() => createRouter(user), [user]);

  return <RouterProvider router={router} />;
};

const PrivateRoute = () => {
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

  return <GrantsProvider user={user}>
    <Pages.MainLayout>
      {privateRoute}
    </Pages.MainLayout>
  </GrantsProvider>
};

const createRouter = (user: UserWithGroups | null) =>
  sentryCreateBrowserRouter([
    {
      path: '/auth',
      element: <Pages.AuthLayoutShadcn />,
      children: [
        {
          path: 'login',
          element: <LoginFormShadcn />,
          errorElement: <ErrorRouteElement />,
        },
        {
          path: 'signup',
          element: <SignUpFormShadcn />,
          errorElement: <ErrorRouteElement />,
        },
        {
          path: 'forgot-password',
          element: <ForgotPasswordShadcn />,
          errorElement: <ErrorRouteElement />,
        }
      ],
    },
    {
      path: '/',
      element: <PrivateRoute />,
      errorElement: <ErrorRouteElement />,
      children: [
        {
          path: '',
          errorElement: <ErrorRouteElement />,
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
              element: <Pages.AppInformationShadcn />,
            },
            {
              path: '/home',
              element: <Pages.HomePageShadcn />,
            },
            {
              path: '/keys',
              element: <Pages.ItemHolderScreenShadcn />,
            },
            {
              path: '/notifications',
              element: <Pages.NotificationScreen />,
            },
            {
              path: '/user',
              element: <Outlet />,
              errorElement: <ErrorRouteElement />,
              children: [
                {
                  index: true,
                  element: <Pages.User />,
                }
              ],
            },
            {
              path: '/drinks',
              element: (
                <Has feat={'drinks'} fallback={<FeatureLockedRouteElement />}>
                  <Outlet />
                </Has>
              ),
              errorElement: <ErrorRouteElement />,
              children: [
                {
                  index: true,
                  element: <Navigate to="/drinks/list" />,
                },
                {
                  path: 'list',
                  element: <Pages.DrinkListScreen />,
                },
                {
                  path: 'history',
                  element: <Pages.HistoryScreenProvider />,
                },
                {
                  path: 'payments',
                  element: <Pages.PayDrinksScreen />,
                },
              ],
            },
            {
              path: '/challenges',
              element: (
                <Has feat={'challenges'} fallback={<FeatureLockedRouteElement />}>
                  <Outlet />
                </Has>
              ),
              errorElement: <ErrorRouteElement />,
              children: [
                {
                  index: true,
                  element: <Navigate to="/challenges/list" />,
                },
                {
                  path: 'list',
                  element: <Pages.ChallengeListShadcn />,
                },
                {
                  path: ':challengeId',
                  element: <Pages.ChallengeInfoScreen />,
                },
              ],
            },
            {
              path: '/groups',
              element: <Outlet />,
              errorElement: <ErrorRouteElement />,
              children: [
                {
                  index: true,
                  element: <Navigate to="/groups/list" />,
                },
                {
                  path: 'list',
                  element: <Pages.PublicGroupList />,
                },
                {
                  path: ':groupId',
                  element: <Pages.PublicGroupInformation />,
                },
              ],
            },
            {
              path: '/training',
              element: (
                <Has feat={'events'} fallback={<FeatureLockedRouteElement />}>
                  <Outlet />
                </Has>
              ),
              errorElement: <ErrorRouteElement />,
              children: [
                {
                  index: true,
                  element: <Navigate to="/training/list" />,
                },
                {
                  path: 'list',
                  element: <Pages.EventScreen />,
                },
                {
                  path: 'recurringEvents',
                  element: <Pages.RecurringEventsShadcn />,
                },
                {
                  path: 'event/:selectedEventId',
                  element: <Pages.EventInformation />,
                },
              ],
            },
            {
              path: '/matches',
              element: (
                <Has feat={'games'} fallback={<FeatureLockedRouteElement />}>
                  <Outlet />
                </Has>
              ),
              errorElement: <ErrorRouteElement />,
              children: [
                {
                  index: true,
                  element: <Navigate to="/matches/list" />,
                },
                {
                  path: 'list',
                  element: <Pages.GameListShadcn />,
                },
                {
                  path: ':matchId',
                  element: <Pages.MatchInformationShadcn />,
                },
                {
                  path: 'leaderboard',
                  element: <Pages.LeaderboardShadcn />,
                }
              ],
            },
            {
              path: '/supabase',
              errorElement: <ErrorRouteElement />,
              children: [
                {
                  path: 'logs',
                  element: (
                    <Has perm={'supabase.admin'} fallback={<UnauthorizedRouteElement />}>
                      <Pages.LogsManager />
                    </Has >
                  ),
                },
                {
                  path: 'database',
                  element: (
                    <Has perm={'supabase.admin'} fallback={<UnauthorizedRouteElement />}>
                      <Pages.DatabaseManager />
                    </Has>
                  ),
                }
              ]
            },
            {
              path: '/admin',
              element: <Outlet />,
              errorElement: <ErrorRouteElement />,
              children: [
                {
                  path: 'drinks/history',
                  element: <Pages.AdminHistoryScreenShadcn />,
                },
                {
                  path: 'drinks/payments',
                  element: <Pages.PaymentsPendingAdminShadcn />,
                },
                {
                  path: 'users',
                  element: <Pages.AdminUserList />,
                },
                {
                  path: 'analytics',
                  element: <Pages.AdminAnalyticsShadcn />
                },
                {
                  path: 'grants',
                  element: (
                    <Has perm={'grants.manage'}>
                      <Pages.GrantsManagerShadcn />
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
