import { useGrants } from '@/features/auth/GrantsContext';
import { Feature, Permission } from '@/generated/supabase-types';
import { Has } from '@/hooks/useGrants';
import { queryClient } from '@/lib/queryClient';
import { useRequestedUsersPerGroup } from '@/tanstack/groups';
import { useAllNotifications } from '@/tanstack/notifications';
import { iOS } from '@/utils';
import { argbFromHex, Blend, hexFromArgb } from "@material/material-color-utilities";
import Analytics from '@mui/icons-material/Analytics';
import AnalyticsOutlined from '@mui/icons-material/AnalyticsOutlined';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import Euro from '@mui/icons-material/Euro';
import EuroOutlined from '@mui/icons-material/EuroOutlined';
import Group from '@mui/icons-material/Group';
import Groups from '@mui/icons-material/Groups';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import HelpIcon from '@mui/icons-material/Help';

import History from '@mui/icons-material/History';
import HistoryOutlined from '@mui/icons-material/HistoryOutlined';
import Home from '@mui/icons-material/Home';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import Key from '@mui/icons-material/Key';
import KeyOutlined from '@mui/icons-material/KeyOutlined';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import LeaderboardOutlined from '@mui/icons-material/LeaderboardOutlined';
import Liquor from '@mui/icons-material/Liquor';
import LiquorOutlined from '@mui/icons-material/LiquorOutlined';
import Notifications from '@mui/icons-material/Notifications';
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined';
import Person from '@mui/icons-material/Person';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import Scoreboard from '@mui/icons-material/Scoreboard';
import ScoreboardOutlined from '@mui/icons-material/ScoreboardOutlined';
import SendIcon from '@mui/icons-material/Send';
import SendOutlined from '@mui/icons-material/SendOutlined';
import SportsHandball from '@mui/icons-material/SportsHandball';
import SportsHandballOutlined from '@mui/icons-material/SportsHandballOutlined';
import Storage from '@mui/icons-material/Storage';
import StorageOutlined from '@mui/icons-material/StorageOutlined';
import Update from '@mui/icons-material/Update';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import ViewStreamOutlined from '@mui/icons-material/ViewStreamOutlined';
import { BoxProps, CircularProgress, ListItemButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import { styled } from '@mui/system';
import { TFunction } from 'i18next';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

export const drawerWidth = 360;

type Props = {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
};

export enum StateLayer {
  Hover = 0.08,
  Focus = 0.12,
  Press = 0.121,
  Drag = 0.16,
}

export const getStateLayerColor = (state: StateLayer, containerColor: string, contentColor: string) => {
  return hexFromArgb(
    Blend.cam16Ucs(
      argbFromHex(containerColor),
      argbFromHex(contentColor),
      state
    )
  );
}

const DrawerItem = styled(ListItemButton)(({ theme }) => ({
  borderRadius: 50,
  color: theme.palette.secondary,
  '&:hover': {
    backgroundColor: getStateLayerColor(StateLayer.Hover, '#F2F4F1', '#191C1B'),
    color: getStateLayerColor(StateLayer.Hover, '#3F4945', '#191C1B')
  },
  '&:active': {
    backgroundColor: getStateLayerColor(StateLayer.Press, '#F2F4F1', '#072019'),
    color: getStateLayerColor(StateLayer.Press, '#3F4945', '#191C1B')
  },
  '&.Mui-selected': {
    color: '#072019',
    background: '#CDE9DE',
    '& > .MuiListItemText-root > .MuiTypography-root': {
      fontWeight: 'bold'
    },
    '&:hover': {
      backgroundColor: getStateLayerColor(StateLayer.Hover, '#CDE9DE', '#072019'),
      color: getStateLayerColor(StateLayer.Hover, '#072019', '#CDE9DE')
    },
    '&:active': {
      backgroundColor: getStateLayerColor(StateLayer.Press, '#CDE9DE', '#072019'),
      color: getStateLayerColor(StateLayer.Press, '#072019', '#CDE9DE')
    },
  },
  '& .MuiListItemAvatar-root': {
    display: 'flex',
    verticalAlign: "center"
  },
  '& .MuiListItemIcon-root': {
    alignItems: 'center',
  },
}));

const DrawerBox = styled(Box)<BoxProps>(() => ({
  width: '100%',
  height: '100%',
  overscrollBehaviorX: 'none',
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)',
  overflow: 'auto',
}));

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
    outlinedIcon: React.ReactNode
    secondaryAction?: React.ReactNode
    path: string
    permission?: {
      any?: boolean
      perm?: Permission | Permission[];
      feat?: Feature | Feature[];
    }
  }[]
}

type DrawerContentProps = {
  tab: string;
  handleChange: (value: string) => void;
  t: TFunction;
  version: string;
  request_group_joins: number;
  notification_count: number;
  update_app: () => void;
  isUpdating: boolean;
};
const DrawerContent = ({
  tab,
  handleChange,
  t,
  version,
  request_group_joins,
  notification_count,
  update_app,
  isUpdating
}: DrawerContentProps) => {

  const categories: DrawerCategoryType[] = [
    {
      key: "headerList",
      children: [
        {
          title: "Home",
          icon: <Home />,
          outlinedIcon: <HomeOutlined />,
          path: 'home',
          permission: {
            any: true,
            feat: ['drinks', 'events', 'items']
          }
        },
        {
          title: "Account",
          icon: <Person />,
          outlinedIcon: <PersonOutlined />,
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
          icon: <Liquor />,
          outlinedIcon: <LiquorOutlined />,
          path: 'drinks/list',
          permission: {
            perm: 'drinks.select'
          }
        },
        {
          title: t('browse.history'),
          icon: <History />,
          outlinedIcon: <HistoryOutlined />,
          path: 'drinks/history',
          permission: {
            perm: 'drinks.view.own-history'
          }
        },
        {
          title: t('browse.payment'),
          icon: <Euro />,
          outlinedIcon: <EuroOutlined />,
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
          icon: <SportsHandball />,
          outlinedIcon: <SportsHandballOutlined />,
          path: 'training/list',
          permission: {
            feat: 'events'
          }
        },
        {
          title: t('navigation.groups'),
          icon: <Groups />,
          outlinedIcon: <GroupsOutlined />,
          path: 'groups/list',
          secondaryAction: <Typography fontWeight={'bold'} fontSize={'0.9rem'}>
            {
              request_group_joins || ''
            }
          </Typography >
        },
        {
          title: t('navigation.matches'),
          icon: <Scoreboard />,
          outlinedIcon: <ScoreboardOutlined />,
          path: 'matches/list',
          permission: {
            feat: 'games'
          }
        },
        {
          title: t('navigation.leaderboard'),
          icon: <LeaderboardIcon />,
          outlinedIcon: <LeaderboardOutlined />,
          path: 'matches/leaderboard',
          permission: {
            feat: 'games'
          }
        },
        {
          title: t('navigation.challenges'),
          icon: <EmojiEvents />,
          outlinedIcon: <EmojiEventsOutlined />,
          path: 'challenges/list',
          permission: {
            feat: 'challenges'
          }
        },
        {
          title: t('browse.keys'),
          icon: <Key />,
          outlinedIcon: <Key />,
          path: 'keys',
          permission: {
            feat: 'items'
          }
        },
        {
          title: t('browse.notifications'),
          icon: <Notifications />,
          outlinedIcon: <NotificationsOutlined />,
          path: 'notifications',
          secondaryAction: <Typography fontWeight={'bold'} fontSize={'0.9rem'} >
            {notification_count || ''}
          </Typography>
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
          icon: <Analytics />,
          outlinedIcon: <AnalyticsOutlined />,
          path: 'admin/analytics',
          permission: {
            perm: 'admin.analytics.view'
          }
        },
        {
          title: t('browse.managePayments'),
          icon: <Euro />,
          outlinedIcon: <EuroOutlined />,
          path: 'admin/drinks/payments',
          permission: {
            perm: 'drinks.confirm.payments',
            feat: 'drinks'
          }
        },
        {
          title: t('browse.manageDrinks'),
          icon: <Liquor />,
          outlinedIcon: <LiquorOutlined />,
          path: 'admin/drinks',
          permission: {
            perm: 'drinks.confirm.payments',
            feat: 'drinks'
          }
        },
        {
          title: t('browse.manageUsers'),
          icon: <Group />,
          outlinedIcon: <GroupsOutlined />,
          path: 'admin/users',
          permission: {
            perm: 'users.manage'
          }
        },
        {
          title: t('browse.completeHistory'),
          icon: <History />,
          outlinedIcon: <HistoryOutlined />,
          path: 'admin/drinks/history',
          permission: {
            perm: 'drinks.history.admin',
            feat: 'drinks'
          }
        },
        {
          title: 'Grants-Manager',
          icon: <Key />,
          outlinedIcon: <KeyOutlined />,
          path: 'admin/grants',
          permission: {
            perm: 'grants.manage'
          }
        },
        {
          title: t('browse.notifyUsers'),
          icon: <SendIcon />,
          outlinedIcon: <SendOutlined />,
          path: 'admin/notify_users',
          permission: {
            perm: 'admin.notify_users'
          }
        },
        {
          title: t('browse.auditLogs'),
          icon: <ViewStreamIcon />,
          outlinedIcon: <ViewStreamOutlined />,
          path: 'admin/audit/logs',
          permission: {
            perm: 'supabase.admin'
          }
        },
        {
          title: t('browse.postgresClient'),
          icon: <Storage />,
          outlinedIcon: <StorageOutlined />,
          path: 'admin/supabase',
          permission: {
            perm: 'supabase.admin'
          }
        }
      ]
    }
  ]

  return (
    <DrawerBox>
      {
        categories.map(entry => {
          const entryComponent = <React.Fragment key={entry.header}>
            <List sx={{ p: 2 }}
              {...(entry.header && {
                subheader: <ListSubheader
                  disableSticky
                  sx={{
                    zIndex: '-1',
                    fontWeight: 'bold',
                    lineHeight: 'normal',
                    my: 1,
                    backgroundColor: '#f2ecf1',
                  }}
                >
                  {entry.header}
                </ListSubheader>
              })}>
              {
                entry.children.map(subEntry => {
                  const component = <ListItem key={subEntry.path} disablePadding
                    {...(subEntry.secondaryAction && { secondaryAction: subEntry.secondaryAction })}>
                    <DrawerItem selected={tab == subEntry.path} onClick={() => handleChange(subEntry.path)}>
                      <ListItemIcon>
                        {
                          tab == subEntry.path ? subEntry.icon : subEntry.outlinedIcon
                        }
                      </ListItemIcon>
                      <ListItemText>{subEntry.title}</ListItemText>
                    </DrawerItem>
                  </ListItem>
                  if (subEntry.permission) {
                    return <Has key={subEntry.path} feat={subEntry.permission.feat} perm={subEntry.permission.perm} any={subEntry.permission.any}>
                      {component}
                    </Has>
                  }
                  return component
                })
              }
            </List>
            <Divider />
          </React.Fragment>;

          if (entry.permission) {
            return <Has key={entry.key} feat={entry.permission.feat} perm={entry.permission.perm} any={entry.permission.any}>
              {entryComponent}
            </Has>
          }
          return entryComponent
        })
      }
      <List
        key="infolist"
        sx={{ p: 2 }}
        subheader={
          <ListSubheader
            disableSticky
            sx={{
              zIndex: '-1',
              fontWeight: 'bold',
              lineHeight: 'normal',
              my: 1,
              backgroundColor: '#f2ecf1',
            }}
          >
            Info
          </ListSubheader>
        }
      >
        <ListItem disablePadding>
          <DrawerItem key="app info" selected={tab === 'help'} onClick={() => handleChange('help')}>
            <ListItemAvatar>
              <ListItemIcon>
                <HelpIcon />
              </ListItemIcon>
            </ListItemAvatar>
            <ListItemText
              primary={t('browse.helpAndInformation')}
            />
          </DrawerItem>
        </ListItem>
        <ListItem disablePadding>
          <DrawerItem
            key="update app"
            selected={false}
            onClick={() => !isUpdating && update_app()}
          >
            <ListItemAvatar>
              <ListItemIcon>
                {isUpdating ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <Update />
                )}
              </ListItemIcon>
            </ListItemAvatar>
            <ListItemText
              primary={isUpdating ? 'Aktualisiere...' : t('browse.appRefresh')}
            />
          </DrawerItem>
        </ListItem>
        <ListItem disablePadding>
          <DrawerItem key="app version" selected={false}>
            <ListItemAvatar>
              <ListItemIcon>
                <InfoOutlined />
              </ListItemIcon>
            </ListItemAvatar>
            <ListItemText
              secondary={'App Version'}
              primary={import.meta.env.VITE_APP_VERSION + '.' + version.slice(0, 6)}
            />
          </DrawerItem>
        </ListItem>
      </List>
    </DrawerBox>
  );
};

export const Drawer = ({ open, onClose, onOpen }: Props) => {
  const theme = useTheme();
  console.log(theme.palette)
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useGrants();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  const [tab, setTab] = useState<string>(import.meta.env.VITE_APP_HOMEPAGE);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: requested_group_joins = [] } = useRequestedUsersPerGroup(user);
  const { data: notifications = [] } = useAllNotifications(user);

  useEffect(() => {
    // eslint-disable-next-line
    setTab(window.location.pathname.substring(1));
    // eslint-disable-next-line
  }, [window.location.pathname]);

  const handleChange = (newValue: string) => {
    setTab(newValue);
    navigate('/' + newValue);
    if (!isLargeScreen) onClose();
  };

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

  const drawerContent = (
    <DrawerContent
      tab={tab}
      handleChange={handleChange}
      t={t}
      version={import.meta.env.VITE_GIT_COMMIT}
      request_group_joins={requested_group_joins.length}
      notification_count={notifications.filter((x) => !x.dismissed_at).length}
      update_app={handleAppUpdate}
      isUpdating={isUpdating}
    />
  );

  return (
    <>
      <Box
        component="nav"
        sx={{
          flexGrow: 1,
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          pt: 'env(safe-area-inset-top)',
          pb: 'env(safe-area-inset-bottom)',
          width: { lg: `${drawerWidth}px` },
          flexShrink: { lg: 0 },
        }}
      >
        {
          !isLargeScreen ? (
            <SwipeableDrawer
              variant="temporary"
              anchor="left"
              open={open}
              onOpen={onOpen}
              onClose={onClose}
              // iOS Performance & Geste-Konflikt-Vermeidung
              disableBackdropTransition={!iOS}
              disableDiscovery={false}
              ModalProps={{
                keepMounted: true, // Erhöht Performance beim Wiederöffnen
              }}
              slotProps={{
                paper: {
                  sx: {
                    width: drawerWidth,
                    borderTopRightRadius: 24,
                    borderBottomRightRadius: 24,
                    background: '#f2ecf1',
                    backfaceVisibility: 'hidden',
                    perspective: 1000,
                    pointerEvents: 'auto !important',
                    visibility: 'visible !important',
                  }
                }
              }}
            >
              {drawerContent}
            </SwipeableDrawer>
          ) : (
            /* DESKTOP: Permanent Drawer */
            <SwipeableDrawer
              variant="permanent"
              open
              onOpen={() => { }} // Notwendig für TS, da SwipeableDrawer diese Props verlangt
              onClose={() => { }}
              sx={{
                display: { xs: 'none', lg: 'block' },
                '& .MuiDrawer-paper': {
                  boxSizing: 'border-box',
                  width: drawerWidth,
                  background: '#f2ecf1',
                  border: 'none',
                  position: 'sticky',
                  top: 0,
                  height: '100vh',
                },
              }}
            >
              {drawerContent}
            </SwipeableDrawer>
          )
        }
      </Box>
    </>
  );
};
