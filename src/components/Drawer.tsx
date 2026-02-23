import { useGrants } from '@/features/auth/GrantsContext';
import { Has } from '@/hooks/useGrants';
import { queryClient } from '@/lib/queryClient';
import { useRequestedUsersPerGroup } from '@/tanstack/groups';
import { useAllNotifications } from '@/tanstack/notifications';
import { iOS } from '@/utils';
import Analytics from '@mui/icons-material/Analytics';
import EmojiEvents from '@mui/icons-material/EmojiEvents';
import Euro from '@mui/icons-material/Euro';
import Group from '@mui/icons-material/Group';
import Groups from '@mui/icons-material/Groups';
import HelpIcon from '@mui/icons-material/Help';
import History from '@mui/icons-material/History';
import Home from '@mui/icons-material/Home';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import InstallDesktop from '@mui/icons-material/InstallDesktop';
import Key from '@mui/icons-material/Key';
import Liquor from '@mui/icons-material/Liquor';
import Notifications from '@mui/icons-material/Notifications';
import Person from '@mui/icons-material/Person';
import Scoreboard from '@mui/icons-material/Scoreboard';
import SendIcon from '@mui/icons-material/Send';
import SportsHandball from '@mui/icons-material/SportsHandball';
import StorageOutlined from '@mui/icons-material/StorageOutlined';
import Update from '@mui/icons-material/Update';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import { alpha, BoxProps, CircularProgress, ListItemProps, useMediaQuery, useTheme } from '@mui/material';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import Typography from '@mui/material/Typography';
import { keyframes, styled } from '@mui/system';
import { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { InstallPWA } from './PwaInstallPromp';

export const drawerWidth = 360;

type Props = {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
};

interface StyledDrawerItemProps extends ListItemProps {
  selected?: boolean;
}

const DrawerItem = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== 'selected',
})<StyledDrawerItemProps>(({ theme, selected = false }) => ({
  borderRadius: 28,
  height: 56,
  marginRight: 12,
  marginLeft: 12,
  width: 'unset',
  cursor: 'pointer',
  backgroundPosition: 'center',
  transition: 'background 0.2s',
  '&:hover': {
    background: alpha('#808080', 0.2),
  },
  '&:active': {
    backgroundColor: 'unset',
  },
  '& .MuiListItemSecondaryAction-root': {
    right: 24,
  },
  '& .MuiListItemAvatar-root': {
    display: 'flex',
    width: '28px',
    height: '28px',
    marginRight: '12px',
    minWidth: 'unset',
  },
  '& .MuiListItemIcon-root': {
    alignItems: 'center',
  },
  ...(selected && {
    backgroundColor: alpha(theme.palette.secondary.main, 0.16),
    '&:hover': {
      backgroundColor: alpha(theme.palette.secondary.main, 0.3),
    },
  }),
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
  return (
    <DrawerBox>
      <List>
        {
          <Has feat={['drinks', 'events', 'items']} any>
            <DrawerItem key="homepage" selected={tab === 'home'} onClick={() => handleChange('home')}>
              <ListItemAvatar>
                <ListItemIcon>
                  <Home />
                </ListItemIcon>
              </ListItemAvatar>
              <ListItemText primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }} primary={'Home'} />
            </DrawerItem>
          </Has>
        }
        {
          <DrawerItem key="user" selected={tab === 'user'} onClick={() => handleChange('user')}>
            <ListItemAvatar>
              <ListItemIcon>
                <Person />
              </ListItemIcon>
            </ListItemAvatar>
            <ListItemText primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }} primary={'Account'} />
          </DrawerItem>
        }

        <InstallPWA
          element={(onClick) => (
            <DrawerItem key="installPWA" selected={false} onClick={onClick}>
              <ListItemAvatar>
                <ListItemIcon>
                  <InstallDesktop />
                </ListItemIcon>
              </ListItemAvatar>
              <ListItemText
                primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                primary={'Installieren'}
              />
            </DrawerItem>
          )}
        />
      </List>
      <Divider />
      <Has feat={'drinks'}>
        <List
          key="drinkList"
          subheader={
            <ListSubheader
              disableSticky
              sx={{
                zIndex: '-1',
                fontWeight: 'bold',
                lineHeight: 'normal',
                my: 2,
                mx: 2,
                backgroundColor: '#f2ecf1',
              }}
            >
              {t('navigation.drinks')}
            </ListSubheader>
          }
        >
          <Has perm={'drinks.select'}>
            <DrawerItem key="drinks" selected={tab === 'drinks/list'} onClick={() => handleChange('drinks/list')}>
              <ListItemAvatar>
                <ListItemIcon>
                  <Liquor />
                </ListItemIcon>
              </ListItemAvatar>
              <ListItemText
                primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                primary={t('navigation.drinks')}
              />
            </DrawerItem>
          </Has>
          <Has perm={'drinks.view.own-history'}>
            <DrawerItem
              key="history"
              selected={tab === 'drinks/history'}
              onClick={() => handleChange('drinks/history')}
            >
              <ListItemAvatar>
                <ListItemIcon>
                  <History />
                </ListItemIcon>
              </ListItemAvatar>
              <ListItemText
                primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                primary={t('browse.history')}
              />
            </DrawerItem>
          </Has>
          <Has perm={'drinks.view.own-payments'}>
            <DrawerItem
              key="payments"
              selected={tab === 'drinks/payments'}
              onClick={() => handleChange('drinks/payments')}
            >
              <ListItemAvatar>
                <ListItemIcon>
                  <Euro />
                </ListItemIcon>
              </ListItemAvatar>
              <ListItemText
                primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                primary={t('browse.payment')}
              />
            </DrawerItem>
          </Has>
          <Divider />
        </List>
      </Has>

      <List key="mainList">
        <Has feat={'events'}>
          <DrawerItem key="events" selected={tab === 'training/list'} onClick={() => handleChange('training/list')}>
            <ListItemAvatar>
              <ListItemIcon>
                <SportsHandball />
              </ListItemIcon>
            </ListItemAvatar>
            <ListItemText
              primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
              primary={t('navigation.training')}
            />
          </DrawerItem>
        </Has>
        <DrawerItem
          key="groups"
          selected={tab === 'groups/list'}
          onClick={() => handleChange('groups/list')}
          secondaryAction={
            <Typography fontWeight={'bold'} fontSize={'0.9rem'}>
              {request_group_joins || ''}
            </Typography>
          }
        >
          <ListItemAvatar>
            <ListItemIcon>
              <Badge color={'secondary'} variant={'dot'} badgeContent={request_group_joins}>
                <Groups />
              </Badge>
            </ListItemIcon>
          </ListItemAvatar>
          <ListItemText
            primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
            primary={t('navigation.groups')}
          />
        </DrawerItem>
        <Has feat={'games'}>
          <DrawerItem key="matches" selected={tab === 'matches/list'} onClick={() => handleChange('matches/list')}>
            <ListItemAvatar>
              <ListItemIcon>
                <Scoreboard />
              </ListItemIcon>
            </ListItemAvatar>
            <ListItemText
              primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
              primary={t('navigation.matches')}
            />
          </DrawerItem>
        </Has>
        <Has feat={'challenges'}>
          <DrawerItem key="challenges" selected={tab === 'challenges/list'} onClick={() => handleChange('challenges')}>
            <ListItemAvatar>
              <ListItemIcon>
                <EmojiEvents />
              </ListItemIcon>
            </ListItemAvatar>
            <ListItemText
              primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
              primary={t('navigation.challenges')}
            />
          </DrawerItem>
        </Has>
        <Has feat={'items'}>
          <DrawerItem key="keys" selected={tab === 'keys'} onClick={() => handleChange('keys')}>
            <ListItemAvatar>
              <ListItemIcon>
                <Key />
              </ListItemIcon>
            </ListItemAvatar>
            <ListItemText
              primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
              primary={t('browse.keys')}
            />
          </DrawerItem>
        </Has>
        <DrawerItem
          key="notifications"
          selected={tab === 'notifications'}
          onClick={() => handleChange('notifications')}
          secondaryAction={
            <Typography fontWeight={'bold'} fontSize={'0.9rem'}>
              {notification_count || ''}
            </Typography>
          }
        >
          <ListItemAvatar>
            <ListItemIcon>
              <Badge color={'secondary'} variant={'dot'} badgeContent={notification_count}>
                <Notifications />
              </Badge>
            </ListItemIcon>
          </ListItemAvatar>
          <ListItemText
            primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
            primary={t('browse.notifications')}
          />
        </DrawerItem>
      </List>
      <Has
        perm={[
          'drinks.confirm.payments',
          'drinks.manage',
          'users.manage',
          'drinks.history.admin',
          'grants.manage',
          'supabase.admin',
        ]}
        any
      >
        <>
          <Divider />
          <List
            key="adminList"
            subheader={
              <ListSubheader
                disableSticky
                sx={{
                  zIndex: '-1',
                  fontWeight: 'bold',
                  lineHeight: 'normal',
                  my: 2,
                  mx: 2,
                  backgroundColor: '#f2ecf1',
                }}
              >
                Admin
              </ListSubheader>
            }
          >
            <Has perm={'admin.analytics.view'}>
              <DrawerItem
                key="adminAnalytics"
                selected={tab === 'admin/analytics'}
                onClick={() => handleChange('admin/analytics')}
              >
                <ListItemAvatar>
                  <ListItemIcon>
                    <Analytics />
                  </ListItemIcon>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                  primary={t('browse.analytics')}
                />
              </DrawerItem>
            </Has>
            <Has feat={'drinks'} perm={'drinks.confirm.payments'}>
              <DrawerItem
                key="updatePayements"
                selected={tab === 'admin/drinks/payments'}
                onClick={() => handleChange('admin/drinks/payments')}
              >
                <ListItemAvatar>
                  <ListItemIcon>
                    <Euro />
                  </ListItemIcon>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                  primary={t('browse.managePayments')}
                />
              </DrawerItem>
            </Has>
            <Has feat={'drinks'} perm={'drinks.manage'}>
              <DrawerItem
                key="updateDrink"
                selected={tab === 'admin/drinks'}
                onClick={() => handleChange('admin/drinks')}
              >
                <ListItemAvatar>
                  <ListItemIcon>
                    <Liquor />
                  </ListItemIcon>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                  primary={t('browse.manageDrinks')}
                />
              </DrawerItem>
            </Has>
            <Has perm={'users.manage'}>
              <DrawerItem key="updateUser" selected={tab === 'admin/users'} onClick={() => handleChange('admin/users')}>
                <ListItemAvatar>
                  <ListItemIcon>
                    <Group />
                  </ListItemIcon>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                  primary={t('browse.manageUsers')}
                />
              </DrawerItem>
            </Has>
            <Has feat={'drinks'} perm={'drinks.history.admin'}>
              <DrawerItem
                key="updateHistory"
                selected={tab === 'admin/drinks/history'}
                onClick={() => handleChange('admin/drinks/history')}
              >
                <ListItemAvatar>
                  <ListItemIcon>
                    <History />
                  </ListItemIcon>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                  primary={t('browse.completeHistory')}
                />
              </DrawerItem>
            </Has>
            <Has perm={'grants.manage'}>
              <DrawerItem
                key="grantsManager"
                selected={tab === 'admin/grants'}
                onClick={() => handleChange('admin/grants')}
              >
                <ListItemAvatar>
                  <ListItemIcon>
                    <Key />
                  </ListItemIcon>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                  primary={'Grants-Manager'}
                />
              </DrawerItem>
            </Has>
            <Has perm={'admin.notify_users'}>
              <DrawerItem
                key="notify_users"
                selected={tab === 'admin/notify_users'}
                onClick={() => handleChange('admin/notify_users')}
              >
                <ListItemAvatar>
                  <ListItemIcon>
                    <SendIcon />
                  </ListItemIcon>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                  primary={t('browse.notifyUsers')}
                />
              </DrawerItem>
            </Has>
            <Has perm={'supabase.admin'}>
              <DrawerItem
                key="audit_logs"
                selected={tab === 'admin/audit/logs'}
                onClick={() => handleChange('admin/audit/logs')}
              >
                <ListItemAvatar>
                  <ListItemIcon>
                    <ViewStreamIcon />
                  </ListItemIcon>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                  primary={t('browse.auditLogs')}
                />
              </DrawerItem>
            </Has>
            <Has perm={'supabase.admin'}>
              <DrawerItem
                key="supabaseClient"
                selected={tab === 'admin/supabase'}
                onClick={() => handleChange('admin/supabase')}
              >
                <ListItemAvatar>
                  <ListItemIcon>
                    <StorageOutlined />
                  </ListItemIcon>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                  primary={t('browse.postgresClient')}
                />
              </DrawerItem>
            </Has>
          </List>
          <Divider />
        </>
      </Has>
      <List
        key="infolist"
        subheader={
          <ListSubheader
            disableSticky
            sx={{
              zIndex: '-1',
              fontWeight: 'bold',
              lineHeight: 'normal',
              my: 2,
              mx: 2,
              backgroundColor: '#f2ecf1',
            }}
          >
            Info
          </ListSubheader>
        }
      >
        <DrawerItem key="app info" selected={tab === 'help'} onClick={() => handleChange('help')}>
          <ListItemAvatar>
            <ListItemIcon>
              <HelpIcon />
            </ListItemIcon>
          </ListItemAvatar>
          <ListItemText
            primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
            primary={t('browse.helpAndInformation')}
          />
        </DrawerItem>
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
            primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
            primary={isUpdating ? 'Aktualisiere...' : t('browse.appRefresh')}
          />
        </DrawerItem>
        <DrawerItem key="app version" selected={false}>
          <ListItemAvatar>
            <ListItemIcon>
              <InfoOutlined />
            </ListItemIcon>
          </ListItemAvatar>
          <ListItemText
            primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
            secondary={'App Version'}
            primary={import.meta.env.VITE_APP_VERSION + '.' + version.slice(0, 6)}
          />
        </DrawerItem>
      </List>
    </DrawerBox>
  );
};

export const Drawer = ({ open, onClose, onOpen }: Props) => {
  const theme = useTheme();
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
              swipeAreaWidth={60} // Ermöglicht das "Herausziehen" vom Rand
              minFlingVelocity={300}
              hysteresis={0.1}
              ModalProps={{
                keepMounted: true, // Erhöht Performance beim Wiederöffnen
              }}
              sx={{
                '& .MuiSwipeableDrawer-swipeArea': {
                  backgroundColor: 'transparent',
                  pointerEvents: 'auto',
                  touchAction: 'none',
                },
              }}
              slotProps={{
                paper: {
                  sx: {
                    width: drawerWidth,
                    borderTopRightRadius: 24,
                    borderBottomRightRadius: 24,
                    background: '#f2ecf1',
                    // Verhindert Flackern auf iOS während der Animation
                    backfaceVisibility: 'hidden',
                    perspective: 1000,
                    pointerEvents: 'auto !important',
                    visibility: 'visible !important',
                  }
                },
                docked: {
                  sx: {
                    pointerEvents: 'all !important',
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
        {/* <CustomDrawer
        variant="temporary"
        anchor={'left'}
        open={open}
        onOpen={onOpen}
        onClose={onClose}
        disableBackdropTransition={!iOS}
        disableDiscovery={iOS}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={(theme: Theme) => ({
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          [theme.breakpoints.down('lg')]: { display: 'block', overflow: 'auto' },
          [theme.breakpoints.up('lg')]: { display: 'none' },
        })}
      >
        {drawerContent}
      </CustomDrawer>
      <CustomDrawer
        anchor={'left'}
        variant="permanent"
        sx={(theme: Theme) => ({
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          [theme.breakpoints.down('lg')]: { display: 'none' },
          [theme.breakpoints.up('lg')]: { display: 'block' },
        })}
        open
        onOpen={onOpen}
        onClose={onClose}
        disableBackdropTransition={!iOS}
        disableDiscovery={iOS}
      >
        {drawerContent}
      </CustomDrawer> */}
      </Box>
    </>
  );
};
