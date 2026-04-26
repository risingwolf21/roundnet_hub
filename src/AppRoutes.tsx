import { useMemo } from 'react';
import { Navigate, Outlet, RouteObject, RouterProvider, useLocation } from 'react-router';
import { useApplication } from './features/auth/ApplicationContext';

import { Has } from './hooks/useGrants';
import { sentryCreateBrowserRouter } from './instrument';
import { UserWithGroups } from './types/supabaseTypes';

import { GrantsProvider } from './features/auth/GrantsContext';
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

  return <GrantsProvider user={user}>
    <Pages.MainLayout>
      <Pages.DialogsProvider>
        <Outlet />
      </Pages.DialogsProvider>
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
          element: <Pages.LoginFormShadcn />,
          errorElement: <Pages.ErrorRouteElement />,
        },
        {
          path: 'signup',
          element: <Pages.SignUpFormShadcn />,
          errorElement: <Pages.ErrorRouteElement />,
        },
        {
          path: 'forgot-password',
          element: <Pages.ForgotPasswordShadcn />,
          errorElement: <Pages.ErrorRouteElement />,
        }
      ],
    },
    {
      path: '/',
      element: <PrivateRoute />,
      errorElement: <Pages.ErrorRouteElement />,
      children: [
        {
          path: '',
          errorElement: <Pages.ErrorRouteElement />,
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
              errorElement: <Pages.ErrorRouteElement />,
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
                <Has feat={'drinks'} fallback={<Pages.FeatureLockedRouteElement />}>
                  <Outlet />
                </Has>
              ),
              errorElement: <Pages.ErrorRouteElement />,
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
                <Has feat={'challenges'} fallback={<Pages.FeatureLockedRouteElement />}>
                  <Outlet />
                </Has>
              ),
              errorElement: <Pages.ErrorRouteElement />,
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
              errorElement: <Pages.ErrorRouteElement />,
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
                <Has feat={'events'} fallback={<Pages.FeatureLockedRouteElement />}>
                  <Outlet />
                </Has>
              ),
              errorElement: <Pages.ErrorRouteElement />,
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
                <Has feat={'games'} fallback={<Pages.FeatureLockedRouteElement />}>
                  <Outlet />
                </Has>
              ),
              errorElement: <Pages.ErrorRouteElement />,
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
              errorElement: <Pages.ErrorRouteElement />,
              children: [
                {
                  path: 'logs',
                  element: (
                    <Has perm={'supabase.admin'} fallback={<Pages.UnauthorizedRouteElement />}>
                      <Pages.LogsManager />
                    </Has >
                  ),
                },
                {
                  path: 'database',
                  element: (
                    <Has perm={'supabase.admin'} fallback={<Pages.UnauthorizedRouteElement />}>
                      <Pages.DatabaseManager />
                    </Has>
                  ),
                }
              ]
            },
            {
              path: '/admin',
              element: <Outlet />,
              errorElement: <Pages.ErrorRouteElement />,
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
