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
    <Pages.DialogsProvider>
      <Pages.MainLayout>
        <Outlet />
      </Pages.MainLayout>
    </Pages.DialogsProvider>
  </GrantsProvider>
};

const createRouter = (user: UserWithGroups | null) =>
  sentryCreateBrowserRouter([
    {
      path: '/auth',
      element: <Pages.AuthLayout />,
      children: [
        {
          path: 'login',
          element: <Pages.LoginForm />,
          errorElement: <Pages.ErrorRouteElement />,
        },
        {
          path: 'signup',
          element: <Pages.SignUpForm />,
          errorElement: <Pages.ErrorRouteElement />,
        },
        {
          path: 'forgot-password',
          element: <Pages.ForgotPassword />,
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
              element: <Pages.AppInformation />,
            },
            {
              path: '/home',
              element: <Pages.HomePage />,
            },
            {
              path: '/keys',
              element: <Pages.ItemHolderScreen />,
            },
            {
              path: '/notifications',
              element: <Pages.NotificationScreen />,
            },
            {
              path: '/search',
              element: <Pages.UserSearchPage />,
            },
            {
              path: '/costs',
              element: (
                <Has feat={'costs'} fallback={<Pages.FeatureLockedRouteElement />}>
                  <Pages.TournamentCostsPage />
                </Has>
              ),
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
                  element: <Pages.ChallengeList />,
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
                  element: <Pages.RecurringEvents />,
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
                  element: <Pages.GameList />,
                },
                {
                  path: ':matchId',
                  element: <Pages.MatchInformation />,
                },
                {
                  path: 'leaderboard',
                  element: <Pages.Leaderboard />,
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
                  index: true,
                  element: <Pages.AdminDashboard />,
                },
                {
                  path: 'drinks/history',
                  element: <Has perm={'drinks.history.admin'} fallback={<Pages.UnauthorizedRouteElement />}>
                    <Pages.AdminHistoryScreen />
                  </Has>
                },
                {
                  path: 'drinks/payments',
                  element: <Has perm={'drinks.confirm.payments'} fallback={<Pages.UnauthorizedRouteElement />}>
                    <Pages.PaymentsPendingAdmin />
                  </Has>
                },
                {
                  path: 'users',
                  element: <Has perm={'users.manage'} fallback={<Pages.UnauthorizedRouteElement />}>
                    <Pages.AdminUserList />
                  </Has>
                },
                {
                  path: 'analytics',
                  element: <Has perm={'admin.analytics.view'} fallback={<Pages.UnauthorizedRouteElement />}>
                    <Pages.AdminAnalytics />
                  </Has>
                },
                {
                  path: 'grants',
                  element: (
                    <Has perm={'grants.manage'}>
                      <Pages.GrantsManager />
                    </Has>
                  ),
                },
                {
                  path: 'merge_accounts',
                  element: <Has perm={'games.admin.merge_accounts'} fallback={<Pages.UnauthorizedRouteElement />}>
                    <Pages.UserPlayerMapping />
                  </Has>
                },
                {
                  path: 'notify_users',
                  element: (
                    <Has perm={'admin.notify_users'} fallback={<Pages.UnauthorizedRouteElement />}>
                      <Pages.NotifyUsersScreen />
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
