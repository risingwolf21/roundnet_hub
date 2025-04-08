import React, { useEffect } from "react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router";
import ErrorRouteElement from "./components/ErrorRouteElement";
import { useApplication } from "./features/auth/AuthContext";
import { useServiceWorker } from "./hooks/useServiceWorker";

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
const ManageGroupInformationProvider = React.lazy(() => import('./features/groups/ManageGroupInformation'));
const ManageGroupsProvider = React.lazy(() => import('./features/groups/ManageGroups'));
const EventInformationProvider = React.lazy(() => import('./pages/EventInformation.page'));
const EventScreenProvider = React.lazy(() => import('./pages/EventList.page'));
const ProfileScreen = React.lazy(() => import('./components/Profile'));
const NotificationScreen = React.lazy(() => import('./features/notifications/NotificationScreen'));
const ChallengeScreen = React.lazy(() => import('./features/challenges/ChallengeList'));
const ChallengeInfoScreen = React.lazy(() => import('./features/challenges/ChallengeInformation'));
const RecurringEvents = React.lazy(() => import('./features/events/RecurringEvents'));
const GameList = React.lazy(() => import('./features/games/GameList'));
const ReportScore = React.lazy(() => import('./features/games/ReportScore'));
const UpdateAvailable = React.lazy(() => import('./components/UpdateAvailable'));
const NotVerifiedScreen = React.lazy(() => import('./components/NotVerifiedScreen'));
const HomePage = React.lazy(() => import('./features/homepage/HomePage'));
const SupabaseClient = React.lazy(() => import('./features/supabase/SupabaseClient'));
const UserScreenProvider = React.lazy(() => import('./features/profile/User'));
const PermissionList = React.lazy(() => import('./features/admin/PermissionList'));
const LoginScreen = React.lazy(() => import('./features/auth/LoginScreen'));
const SignUpScreen = React.lazy(() => import('./features/auth/SignUpScreen'));
const ForgotPasswordScreen = React.lazy(() => import('./features/auth/ForgotPasswordScreen'));
const AuthCallback = React.lazy(() => import('./features/auth/AuthCallback'));
const PublicGroupList = React.lazy(() => import('./features/groups/PublicGroupList'));
const PublicGroupInformation = React.lazy(() => import('./features/groups/PublicGroupInformation'));

export const AppRoutes = () => {
  const { user } = useApplication();
  const { isUpdateAvailable, updateServiceWorker } = useServiceWorker();

  const routes = user ? protectedRoutes : publicRoutes;

  const router = createBrowserRouter(routes)

  if (isUpdateAvailable) return <UpdateAvailable update={updateServiceWorker} />;

  return <RouterProvider router={router} />
}

const publicRoutes = [
  {
    path: "/",
    element: <Outlet />,
    errorElement: <ErrorRouteElement />,
    children: [
      {
        index: true,
        element: <Navigate to="/login" />
      },
      {
        path: "/login",
        element: <LoginScreen />,
      },
      {
        path: "/signup",
        element: <SignUpScreen />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPasswordScreen />,
      },
      {
        path: "/reset-password",
        element: <ResetPasswordScreen />
      },
      {
        path: "/auth/callback",
        element: <AuthCallback />,
      }
    ]
  }
]

const protectedRoutes = [
  {
    path: "/login",
    element: (
      <LoginScreen />
    ),
  },
  {
    path: "/",
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
        path: "/not-verified",
        element: <NotVerifiedScreen />
      },
      {
        path: "/feature-not-available",
        element: <FeatureNotAvailable />
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
          },
          {
            path: ":userId",
            element: <ProfileScreen />
          }
        ]
      },
      {
        path: "/challenges",
        children: [
          {
            index: true,
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
          },
          {
            path: "createOrUpdate/:option",
            element: <CreateEventProvider />
          }
        ]
      },
      {
        path: "/matches",
        children: [
          {
            index: true,
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
          },
          {
            path: "groups",
            element: <ManageGroupsProvider />
          },
          {
            path: "groups/:id",
            element: <ManageGroupInformationProvider />
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