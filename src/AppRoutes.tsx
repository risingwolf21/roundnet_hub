import { wrapCreateBrowserRouterV7 } from "@sentry/react";
import React from "react";
import { createBrowserRouter, Navigate, Outlet, RouteObject, RouterProvider, useLocation } from "react-router";
import ErrorRouteElement from "./components/ErrorRouteElement";
import { useApplication } from "./features/auth/ApplicationContext";
import { AuthContext } from "./features/auth/AuthContext";
import { lazyWithRetry } from "./hooks/lazyWithRetry";

const HistoryScreenProvider = lazyWithRetry(() => import('./features/drinks/HistoryScreenProvider'));
const KeyHolderScreenProvider = lazyWithRetry(() => import('./features/keys/provider'));
const PayDrinksScreenProvider = lazyWithRetry(() => import('./features/drinks/PayDrinksScreen'));
const ResetPasswordScreen = lazyWithRetry(() => import('./features/auth/ResetPasswordScreen'));
const PaymentsPendingAdmin = lazyWithRetry(() => import('./features/admin/PaymentsPendingAdmin'));
const AdminDrinkListProvider = lazyWithRetry(() => import('./features/admin/AdminDrinkList'));
const AdminHistoryScreenProvider = lazyWithRetry(() => import('./features/admin/AdminHistoryScreen'));
const AdminUserListProvider = lazyWithRetry(() => import('./features/admin/AdminUserList'));
const DrinkListScreenProvider = lazyWithRetry(() => import('./pages/Drinklist.page'));
const EventInformationProvider = lazyWithRetry(() => import('./pages/EventInformation.page'));
const EventScreenProvider = lazyWithRetry(() => import('./pages/EventList.page'));
const NotificationScreen = lazyWithRetry(() => import('./features/notifications/NotificationScreen'));
const ChallengeScreen = lazyWithRetry(() => import('./features/challenges/ChallengeList'));
const ChallengeInfoScreen = lazyWithRetry(() => import('./features/challenges/ChallengeInformation'));
const RecurringEvents = lazyWithRetry(() => import('./features/events/RecurringEvents'));
const GameList = lazyWithRetry(() => import('./features/games/GameList'));
const ReportScore = lazyWithRetry(() => import('./features/games/ReportScore'));
const HomePage = lazyWithRetry(() => import('./features/homepage/HomePage'));
const SupabaseClient = lazyWithRetry(() => import('./features/supabase/SupabaseClient'));
const UserScreenProvider = lazyWithRetry(() => import('./features/profile/User'));
const PermissionList = lazyWithRetry(() => import('./features/admin/PermissionList'));
const LoginScreen = lazyWithRetry(() => import('./features/auth/LoginScreen'));
const SignUpScreen = lazyWithRetry(() => import('./features/auth/SignUpScreen'));
const ForgotPasswordScreen = lazyWithRetry(() => import('./features/auth/ForgotPasswordScreen'));
const AuthCallback = lazyWithRetry(() => import('./features/auth/AuthCallback'));
const PublicGroupList = lazyWithRetry(() => import('./features/groups/PublicGroupList.page'));
const PublicGroupInformation = lazyWithRetry(() => import('./features/groups/PublicGroupInformation.page'));

const sentryCreateBrowserRouter = wrapCreateBrowserRouterV7(
  createBrowserRouter,
);

export const AppRoutes = () => {

  return <RouterProvider router={router} />
}

const PrivateRoute = () => {
  const { user, signOut } = useApplication();
  const location = useLocation();
  if (!user)
    return <Navigate to="/login" state={{ path: location.pathname + location.search }} />

  return <AuthContext.Provider value={{ user, signOut }}>
    <Outlet />
  </AuthContext.Provider>
}

const router = sentryCreateBrowserRouter([
  {
    path: "/login",
    element: <LoginScreen />,
    errorElement: <ErrorRouteElement />,
  },
  {
    path: "/signup",
    element: <SignUpScreen />,
    errorElement: <ErrorRouteElement />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordScreen />,
    errorElement: <ErrorRouteElement />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordScreen />,
    errorElement: <ErrorRouteElement />,
  },
  {
    path: "/auth/callback",
    element: <AuthCallback />,
    errorElement: <ErrorRouteElement />,
  },
  {
    path: "/",
    element: <PrivateRoute />,
    children: [
      {
        path: "",
        element: <Outlet />,
        errorElement: <ErrorRouteElement />,
        children: [
          {
            index: true,
            element: <Navigate to="/home" />
          },
          {
            path: "/home",
            element: <HomePage />
          },
          {
            path: "/reset-password",
            element: <ResetPasswordScreen />
          },
          {
            path: "/drinks",
            element: <DrinkListScreenProvider />
          },
          {
            path: "/history",
            element: <HistoryScreenProvider />
          },
          {
            path: "/payments",
            element: <PayDrinksScreenProvider />
          },
          {
            path: "/keys",
            element: <KeyHolderScreenProvider />
          },
          {
            path: "/notifications",
            element: <NotificationScreen />
          },
          {
            path: "/user",
            children: [
              {
                index: true,
                element: <UserScreenProvider />
              }
            ]
          },
          {
            path: "/challenges",
            children: [
              {
                index: true,
                element: <Navigate to="/challenges/list" />
              },
              {
                path: "list",
                element: <ChallengeScreen />
              },
              {
                path: ":challengeId",
                element: <ChallengeInfoScreen />
              }
            ]
          },
          {
            path: "/groups",
            children: [
              {
                index: true,
                element: <Navigate to="/groups/list" />
              },
              {
                path: "list",
                element: <PublicGroupList />
              },
              {
                path: ":groupId",
                element: <PublicGroupInformation />
              }
            ]
          },
          {
            path: "/training",
            children: [
              {
                index: true,
                element: <Navigate to="/training/list" />
              },
              {
                path: "list",
                element: <EventScreenProvider />
              },
              {
                path: "recurringEvents",
                element: <RecurringEvents />
              },
              {
                path: "event/:selectedEventId",
                element: <EventInformationProvider />
              }
            ]
          },
          {
            path: "/matches",
            children: [
              {
                index: true,
                element: <Navigate to="/matches/list" />
              },
              {
                path: "list",
                element: <GameList />
              },
              {
                path: "report",
                element: <ReportScore />
              }
            ]
          },
          {
            path: "/admin",
            children: [
              {
                path: "drinks",
                element: <AdminDrinkListProvider />
              },
              {
                path: "drinks/history",
                element: <AdminHistoryScreenProvider />
              },
              {
                path: "drinks/payments",
                element: <PaymentsPendingAdmin />
              },
              {
                path: "users",
                element: <AdminUserListProvider />
              },
              {
                path: "supabase",
                element: <SupabaseClient />
              },
              {
                path: "permissions",
                element: <PermissionList />
              }
            ]
          },
          {
            path: "*",
            element: <Navigate to="/home" replace />
          }
        ]
      }
    ]
  }
] as RouteObject[]);