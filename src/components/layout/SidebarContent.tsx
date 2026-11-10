import { useGrants } from '@/features/auth/GrantsContext';
import { Feature, Permission } from '@/generated/supabase-types';
import { Has } from '@/hooks/useGrants';
import { queryClient } from '@/lib/queryClient';
import { useRequestedUsersPerGroup } from '@/tanstack/groups';
import { useAllNotifications } from '@/tanstack/notifications';
import { Bell, ClipboardList, Euro, HelpCircle, History, Home, KeyRound, LayoutDashboard, Package, Receipt, RefreshCcw, Swords, Trophy, User, Users, Volleyball, Wine } from "lucide-react";
import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar } from '../ui/sidebar';
import { Spinner } from '../ui/spinner';

type DrawerCategoryType = {
  key: string
  header?: string
  permission?: {
    any?: boolean
    perm?: Permission | Permission[];
    feat?: Feature | Feature[];
  }
  children: {
    title: string
    icon: React.ReactNode
    secondaryAction?: React.ReactNode
    path?: string
    onClick?: () => void;
    permission?: {
      any?: boolean
      perm?: Permission | Permission[];
      feat?: Feature | Feature[];
    }
  }[]
}

export function AppSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useGrants();
  const { data: requested_group_joins = [] } = useRequestedUsersPerGroup(user);
  const { data: notifications = [] } = useAllNotifications(user);
  const [isUpdating, setIsUpdating] = useState(false);

  const { setOpenMobile } = useSidebar();
  const tab = location.pathname.substring(1) || "home";

  const updateServiceWorkerWithTimeout = async (timeoutMs: number) => {
    if (!('serviceWorker' in navigator)) return;

    const reg = await navigator.serviceWorker.getRegistration();

    if (reg) {
      try {
        await Promise.race([
          reg.update(),
          new Promise((resolve) => setTimeout(resolve, timeoutMs))
        ]);
      } catch (err) {
        console.warn('SW update check failed or timed out', err);
      }
    }
  };

  const handleAppUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      await updateServiceWorkerWithTimeout(2000);

      await queryClient.cancelQueries();

      await queryClient.resetQueries();

      await new Promise(r => setTimeout(r, 800));

      window.location.reload();

    } catch (e) {
      console.error('Update failed:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const categories: DrawerCategoryType[] = [
    {
      key: "headerList",
      children: [
        {
          title: t('navigation.home'),
          icon: <Home />,
          // No gate: the home page adapts to the user's grants, and without it accounts with few
          // features (e.g. trial guests) have no way back once they leave it.
          path: 'home',
        },
        {
          title: t('navigation.account'),
          icon: <User />,
          path: 'user'
        }
      ]
    },
    {
      header: t('navigation.drinks'),
      key: "drinksList",
      permission: {
        feat: 'drinks'
      },
      children: [
        {
          title: t('navigation.drinks'),
          icon: <Wine className="h-5 w-5" />,
          path: 'drinks/list',
          permission: {
            perm: 'drinks.select'
          }
        },
        {
          title: t('browse.history'),
          icon: <History />,
          path: 'drinks/history',
          permission: {
            perm: 'drinks.view.own-history'
          }
        },
        {
          title: t('browse.payment'),
          icon: <Euro />,
          path: 'drinks/payments',
          permission: {
            perm: 'drinks.view.own-payments'
          }
        }
      ]
    },
    {
      key: "mainList",
      children: [
        {
          title: t('navigation.costs'),
          icon: <Receipt />,
          path: 'costs',
          permission: { feat: 'costs' },
        },
        {
          title: t('navigation.training'),
          icon: <Volleyball />,
          path: 'training/list',
          permission: {
            feat: 'events'
          }
        },
        {
          title: t('navigation.groups'),
          icon: <Users />,
          path: 'groups/list',
          secondaryAction: <div className="text-sm leading-none font-bold">
            {
              requested_group_joins.length || ''
            }
          </div >
        },
        {
          title: t('navigation.matches'),
          icon: <Trophy />,
          path: 'matches/list',
          permission: {
            feat: 'games'
          }
        },
        {
          title: t('navigation.leaderboard'),
          icon: <Trophy />,
          path: 'matches/leaderboard',
          permission: {
            feat: 'games'
          }
        },
        {
          title: t('navigation.challenges'),
          icon: <Swords />,
          path: 'challenges/list',
          permission: {
            feat: 'challenges'
          }
        },
        {
          title: t('navigation.bundesliga'),
          icon: <ClipboardList />,
          path: 'bundesliga',
          permission: {
            feat: 'bundesliga'
          }
        },
        {
          title: t('browse.keys'),
          icon: <KeyRound />,
          path: 'keys',
          permission: {
            feat: 'items'
          }
        },
        {
          title: t('browse.notifications'),
          icon: <Bell />,
          path: 'notifications',
          secondaryAction: <div className="text-sm leading-none font-bold">
            {
              notifications.length || ''
            }
          </div>
        }
      ]
    },
    {
      key: "adminList",
      header: t('navigation.adminHeader'),
      permission: {
        perm: [
          'drinks.confirm.payments',
          'drinks.manage',
          'users.manage',
          'drinks.history.admin',
          'grants.manage',
          'supabase.admin',
          'admin.analytics.view'
        ],
        any: true
      },
      children: [
        {
          title: t('browse.adminOverview'),
          icon: <LayoutDashboard />,
          path: 'admin',
          permission: {
            perm: [
              'drinks.confirm.payments',
              'drinks.manage',
              'users.manage',
              'drinks.history.admin',
              'grants.manage',
              'supabase.admin',
              'admin.analytics.view',
              'games.admin.merge_accounts',
              'admin.notify_users',
            ] as Permission[],
            any: true,
          },
        },
      ]
    },
    {
      key: "infoList",
      children: [
        {
          title: t('navigation.help'),
          path: "help",
          icon: <HelpCircle />
        },
        {
          title: t('navigation.refresh'),
          onClick: handleAppUpdate,
          icon: isUpdating ? <Spinner /> : <RefreshCcw />
        },
        {
          title: [import.meta.env.VITE_APP_VERSION, import.meta.env.VITE_GIT_COMMIT?.slice(0, 6)].filter(Boolean).join('.'),
          icon: <Package />
        }
      ]
    }
  ]

  return (
    <Sidebar>
      <SidebarContent className='pt-safe-top pb-safe-bottom overscroll-none'>
        {categories.map((category, index) => {

          const CategoryContent = (
            <SidebarGroup key={category.key}>
              {category.header && (
                <SidebarGroupLabel>{category.header}</SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className='gap-y-4'>
                  {category.children.map((item) => {
                    const isActive = tab === item.path

                    const component = <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => {
                          if (item.path) {
                            setOpenMobile(false);
                            navigate(`/${item.path}`);
                          } else if (item.onClick) {
                            item.onClick();
                          }
                        }}
                        tooltip={item.title}
                      >
                        {item.icon}
                        <div className='text-lg ml-2'>{item.title}</div>
                      </SidebarMenuButton>

                      {/* Optionales Badge (z.B. für offene Anfragen) */}
                      {item.secondaryAction && (
                        <SidebarMenuBadge>{item.secondaryAction}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                    if (item.permission) {
                      return (
                        <Has key={item.path} feat={item.permission.feat} perm={item.permission.perm} any={item.permission.any} fallback={<></>}>
                          {component}
                        </Has>
                      )
                    }
                    return component;
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )

          // Überprüfe Berechtigungen für die ganze Gruppe
          if (category.permission) {
            return (
              <Has key={category.key} feat={category.permission.feat} perm={category.permission.perm} any={category.permission.any} fallback={<></>}>
                {CategoryContent}
                {index < categories.length - 1 && <SidebarSeparator />}
              </Has>
            )
          }

          return (
            <div key={category.key}>
              {CategoryContent}
              {index < categories.length - 1 && <SidebarSeparator />}
            </div>
          )
        })}
      </SidebarContent>
    </Sidebar>
  )
}