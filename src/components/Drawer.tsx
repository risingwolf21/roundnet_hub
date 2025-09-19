import { useGrants } from '@/features/auth/GrantsContext';
import { Has } from '@/hooks/useGrants';
import { useRequestedUsersPerGroup } from '@/tanstack/groups';
import { useAllNotifications } from '@/tanstack/notifications';
import {
  EmojiEvents,
  Euro,
  Group,
  Groups,
  History,
  Home,
  InfoOutlined,
  InstallDesktop,
  Key,
  Liquor,
  Notifications,
  Person,
  Scoreboard,
  SportsHandball,
  StorageOutlined,
  Update,
} from '@mui/icons-material';
import {
  alpha,
  Badge,
  Box,
  BoxProps,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemProps,
  ListItemText,
  ListSubheader,
  DrawerProps as MuiDrawerProps,
  SwipeableDrawer,
  Theme,
  Typography,
} from '@mui/material';
import { styled } from '@mui/system';
import { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { HOMEPAGE } from '../constants';
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

const DrawerBox = styled(Box)<BoxProps>(({}) => ({
  width: '100%',
  height: 'calc(100% + env(safe-area-inset-top))',
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
  overflow: 'auto',
}));

const CustomDrawer = styled(SwipeableDrawer)<MuiDrawerProps>(({ theme }) => ({
  '& .MuiPaper-root': {
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    background: '#f2ecf1',
    color: '#49454e',
    [theme.breakpoints.down('lg')]: {
      borderTopRightRadius: 24,
      borderBottomRightRadius: 24,
    },
    [theme.breakpoints.up('lg')]: {
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    },
  },
}));

type DrawerContentProps = {
  tab: string;
  handleChange: (value: string) => void;
  t: TFunction;
  version: string;
  request_group_joins: number;
  notification_count: number;
};
const DrawerContent = ({
  tab,
  handleChange,
  t,
  version,
  request_group_joins,
  notification_count,
}: DrawerContentProps) => {
  return (
    <DrawerBox>
      <List>
        {
          <Has feat={['drinks', 'events', 'items']} any>
            <DrawerItem key="homepage" selected={tab === ''} onClick={() => handleChange('')}>
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
      <Has perm={['drinks.confirm.payments', 'drinks.manage']}>
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
            <Has perm={'drinks.confirm.payments'}>
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
            <Has perm={'drinks.manage'}>
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
            <Has perm={'drinks.history.admin'}>
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
        <DrawerItem key="update app" selected={false} onClick={() => window.location.reload()}>
          <ListItemAvatar>
            <ListItemIcon>
              <Update />
            </ListItemIcon>
          </ListItemAvatar>
          <ListItemText
            primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
            primary={'App aktualisieren'}
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
            primary={APP_VERSION + '.' + version.slice(0, 6)}
          />
        </DrawerItem>
      </List>
    </DrawerBox>
  );
};

export const Drawer = ({ open, onClose, onOpen }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useGrants();
  const [tab, setTab] = useState<string>(HOMEPAGE);

  const { data: requested_group_joins = [] } = useRequestedUsersPerGroup();
  const { data: notifications = [] } = useAllNotifications(user);

  const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    setTab(window.location.pathname.substring(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.location.pathname]);

  const handleChange = (newValue: string) => {
    setTab(newValue);
    navigate('/' + newValue);
  };

  const drawerContent = (
    <DrawerContent
      tab={tab}
      handleChange={handleChange}
      t={t}
      version={import.meta.env.VITE_GIT_COMMIT}
      request_group_joins={requested_group_joins.length}
      notification_count={notifications.length}
    />
  );

  return (
    <Box
      component="nav"
      sx={(theme) => ({
        flexGrow: 1,
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        pt: 'env(safe-area-inset-top)',
        pb: 'env(safe-area-inset-bottom)',
        [theme.breakpoints.down('lg')]: {
          width: 'unset',
          flexShrink: 0,
        },
        [theme.breakpoints.up('lg')]: {
          width: `${drawerWidth}px`,
          paddingRight: '24px',
        },
      })}
    >
      <CustomDrawer
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
          [theme.breakpoints.down('lg')]: {
            display: 'block',
            overflow: 'auto',
          },
          [theme.breakpoints.up('lg')]: {
            display: 'none',
          },
        })}
      >
        {drawerContent}
      </CustomDrawer>
      <CustomDrawer
        anchor={'left'}
        variant="permanent"
        sx={(theme: Theme) => ({
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          [theme.breakpoints.down('lg')]: {
            display: 'none',
          },
          [theme.breakpoints.up('lg')]: {
            display: 'block',
            overflow: 'none',
          },
        })}
        open
        onOpen={onOpen}
        onClose={onClose}
        disableBackdropTransition={!iOS}
        disableDiscovery={iOS}
      >
        {drawerContent}
      </CustomDrawer>
    </Box>
  );
};
