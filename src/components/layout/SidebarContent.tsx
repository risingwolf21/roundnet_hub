import { Feature, Permission } from '@/generated/supabase-types';
import { Has } from '@/hooks/useGrants';
import { Bell, ChartArea, Database, Euro, History, Home, KeyRound, Logs, Send, Swords, Trophy, User, Users, Volleyball, Wine } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarSeparator } from '../ui/sidebar';

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
    path: string
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

  const tab = location.pathname.substring(1) || "home";

  const categories: DrawerCategoryType[] = [
    {
      key: "headerList",
      children: [
        {
          title: "Home",
          icon: <Home />,
          path: 'home',
          permission: {
            any: true,
            feat: ['drinks', 'events', 'items']
          }
        },
        {
          title: "Account",
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
            2
            {
              // request_group_joins || ''
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
            2
            {
              // notification_count || ''
            }
          </div>
        }
      ]
    },
    {
      key: "adminList",
      header: "Admin",
      permission: {
        perm: [
          'drinks.confirm.payments',
          'drinks.manage',
          'users.manage',
          'drinks.history.admin',
          'grants.manage',
          'supabase.admin',
        ],
        any: true
      },
      children: [
        {
          title: t('browse.analytics'),
          icon: <ChartArea />,
          path: 'admin/analytics',
          permission: {
            perm: 'admin.analytics.view'
          }
        },
        {
          title: t('browse.managePayments'),
          icon: <Euro />,
          path: 'admin/drinks/payments',
          permission: {
            perm: 'drinks.confirm.payments',
            feat: 'drinks'
          }
        },
        {
          title: t('browse.manageDrinks'),
          icon: <Wine />,
          path: 'admin/drinks',
          permission: {
            perm: 'drinks.confirm.payments',
            feat: 'drinks'
          }
        },
        {
          title: t('browse.manageUsers'),
          icon: <Users />,
          path: 'admin/users',
          permission: {
            perm: 'users.manage'
          }
        },
        {
          title: t('browse.completeHistory'),
          icon: <History />,
          path: 'admin/drinks/history',
          permission: {
            perm: 'drinks.history.admin',
            feat: 'drinks'
          }
        },
        {
          title: 'Grants-Manager',
          icon: <KeyRound />,
          path: 'admin/grants',
          permission: {
            perm: 'grants.manage'
          }
        },
        {
          title: t('browse.notifyUsers'),
          icon: <Send />,
          path: 'admin/notify_users',
          permission: {
            perm: 'admin.notify_users'
          }
        },
        {
          title: t('browse.auditLogs'),
          icon: <Logs />,
          path: 'admin/audit/logs',
          permission: {
            perm: 'supabase.admin'
          }
        },
        {
          title: t('browse.postgresClient'),
          icon: <Database />,
          path: 'admin/supabase',
          permission: {
            perm: 'supabase.admin'
          }
        }
      ]
    }
  ]

  return (
    <Sidebar>
      <SidebarContent className='overflow-x-none'>
        {categories.map((category, index) => {

          const CategoryContent = (
            <SidebarGroup key={category.key}>
              {category.header && (
                <SidebarGroupLabel>{category.header}</SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className='gap-y-2'>
                  {category.children.map((item) => {
                    const isActive = tab === item.path

                    const component = <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => navigate(`/${item.path}`)}
                        tooltip={item.title} // Gut für eingeklappte (collapsed) Sidebars
                      >
                        {item.icon}
                        <div className='text-lg'>{item.title}</div>
                      </SidebarMenuButton>

                      {/* Optionales Badge (z.B. für offene Anfragen) */}
                      {item.secondaryAction && (
                        <SidebarMenuBadge>{item.secondaryAction}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                    if (item.permission) {
                      return (
                        <Has key={category.key} feat={item.permission.feat} perm={item.permission.perm}>
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
              <Has key={category.key} feat={category.permission.feat} perm={category.permission.perm}>
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