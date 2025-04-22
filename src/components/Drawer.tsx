import {
  EmojiEvents,
  Euro,
  Group,
  GroupOutlined,
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
  Update
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
  Drawer as MuiDrawer,
  DrawerProps as MuiDrawerProps,
  Theme,
  Typography,
} from '@mui/material';
import { styled } from '@mui/system';
import { TFunction } from 'i18next';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { HOMEPAGE } from '../constants';
import { notificationsSelector } from '../features/notifications/slices/notificationsSlice';
import raw from '../git_commit.txt';
import { RootState } from '../redux/store';
import { can, canAny } from '../utils/PermissionService';
import { InstallPWA } from './PwaInstallPromp';

export const drawerWidth = 360;

type Props = {
  open: boolean;
  onClose: () => void;
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
    backgroundColor: "unset"
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

const DrawerBox = styled(Box)<BoxProps>(({ theme }) => ({
  width: '100%',
  height: 'calc(100% + env(safe-area-inset-top))',
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
  overflow: 'auto',
}));

const CustomDrawer = styled(MuiDrawer)<MuiDrawerProps>(({ theme }) => ({
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
  notificationsLength: number;
  notVerifiedUsersLength: number;
  version: string;
};
const DrawerContent = ({
  tab,
  handleChange,
  t,
  notificationsLength,
  notVerifiedUsersLength,
  version,
}: DrawerContentProps) => {
  return (
    <DrawerBox>
      <List>
        {
          canAny('select', ['drink', 'drink', 'item']) && <DrawerItem key="homepage" selected={tab === ''} onClick={() => handleChange('')}>
            <ListItemAvatar>
              <ListItemIcon>
                <Home />
              </ListItemIcon>
            </ListItemAvatar>
            <ListItemText primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }} primary={'Home'} />
          </DrawerItem>
        }
        {
          can('select', "user") && <DrawerItem key="user" selected={tab === 'user'} onClick={() => handleChange('user')}>
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
      {canAny('select', ['drink', 'history', 'payments']) && (
        <>
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
            {can('select', 'drink') && (
              <DrawerItem key="drinks" selected={tab === 'drinks'} onClick={() => handleChange('drinks')}>
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
            )}
            {can('select', 'history') && (
              <DrawerItem key="history" selected={tab === 'history'} onClick={() => handleChange('history')}>
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
            )}
            {can('select', 'payments') && (
              <DrawerItem key="payments" selected={tab === 'payments'} onClick={() => handleChange('payments')}>
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
            )}
            <Divider />
          </List>
        </>
      )}

      <List key="mainList">
        {can('select', 'event') && (
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
        )}
        {
          can("select", "group") && <DrawerItem key="groups" selected={tab === 'groups/list'} onClick={() => handleChange('groups/list')}>
            <ListItemAvatar>
              <ListItemIcon>
                <Groups />
              </ListItemIcon>
            </ListItemAvatar>
            <ListItemText
              primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
              primary={t('navigation.groups')}
            />
          </DrawerItem>
        }
        {can('select', 'games') && (
          <DrawerItem key="matches" selected={tab === 'matches'} onClick={() => handleChange('matches')}>
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
        )}
        {can('select', 'challenge') && (
          <DrawerItem key="challenges" selected={tab === 'challenges'} onClick={() => handleChange('challenges')}>
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
        )}
        {can('select', 'item') && (
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
        )}
        {can('view', 'notifications') && (
          <DrawerItem
            key="notifications"
            selected={tab === 'notifications'}
            onClick={() => handleChange('notifications')}
            secondaryAction={
              <Typography fontWeight={'bold'} fontSize={'0.9rem'}>
                {notificationsLength || ''}
              </Typography>
            }
          >
            <ListItemAvatar>
              <ListItemIcon>
                <Badge color={'secondary'} variant={'dot'} badgeContent={notificationsLength}>
                  <Notifications />
                </Badge>
              </ListItemIcon>
            </ListItemAvatar>
            <ListItemText
              primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
              primary={t('browse.notifications')}
            />
          </DrawerItem>
        )}
      </List>
      {canAny('update', ['payments', 'drink', 'user', 'history', 'group']) && (
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
            {can('update', 'payments') && (
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
            )}
            {can('update', 'drink') && (
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
            )}
            {can('update', 'user') && (
              <DrawerItem
                key="updateUser"
                selected={tab === 'admin/users'}
                onClick={() => handleChange('admin/users')}
                secondaryAction={
                  <Typography fontWeight={'bold'} fontSize={'0.9rem'}>
                    {notVerifiedUsersLength || ''}
                  </Typography>
                }
              >
                <ListItemAvatar>
                  <ListItemIcon>
                    <Badge color={'secondary'} variant={'dot'} badgeContent={notVerifiedUsersLength}>
                      <Group />
                    </Badge>
                  </ListItemIcon>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                  primary={t('browse.manageUsers')}
                />
              </DrawerItem>
            )}
            {can('update', 'history') && (
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
            )}
            {can('update', 'group') && (
              <DrawerItem
                key="updateGroup"
                selected={tab === 'admin/groups'}
                onClick={() => handleChange('admin/groups')}
              >
                <ListItemAvatar>
                  <ListItemIcon>
                    <GroupOutlined />
                  </ListItemIcon>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                  primary={t('browse.manageGroups')}
                />
              </DrawerItem>
            )}
            {can('view', 'postgres') && (
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
            )}
            {can('view', 'postgres') && (
              <DrawerItem
                key="permission"
                selected={tab === 'admin/permissions'}
                onClick={() => handleChange('admin/permissions')}
              >
                <ListItemAvatar>
                  <ListItemIcon>
                    <GroupOutlined />
                  </ListItemIcon>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                  primary={t('browse.permissions')}
                />
              </DrawerItem>
            )}
            {can('view', 'postgres') && (
              <DrawerItem
                key="sentryIssues"
                selected={tab === 'admin/sentry-issues'}
                onClick={() => handleChange('admin/sentry-issues')}
              >
                <ListItemAvatar>
                  <ListItemIcon>
                    <StorageOutlined />
                  </ListItemIcon>
                </ListItemAvatar>
                <ListItemText
                  primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                  primary={t('browse.sentryIssues')}
                />
              </DrawerItem>
            )}
          </List>
          <Divider />
        </>
      )}
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
            primary={process.env.REACT_APP_VERSION + '.' + version.slice(0, 6)}
          />
        </DrawerItem>
      </List>
    </DrawerBox>
  );
};

export const Drawer = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState<string>(HOMEPAGE);
  const notifications = useSelector((state: RootState) => notificationsSelector.selectAll(state));
  const { notVerifiedUsers } = useSelector((state: RootState) => state.adminUsers);
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    fetch(raw)
      .then((r) => r.text())
      .then((text) => {
        setVersion(text);
      });
  }, []);

  useEffect(() => {
    setTab(window.location.pathname.substring(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.location.pathname]);

  const handleChange = (newValue: string) => {
    setTab(newValue);
    navigate('/' + newValue);
  };

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
        onClose={onClose}
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
        <DrawerContent
          tab={tab}
          handleChange={handleChange}
          t={t}
          notVerifiedUsersLength={notVerifiedUsers}
          notificationsLength={notifications.length}
          version={version}
        />
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
      >
        <DrawerContent
          tab={tab}
          handleChange={handleChange}
          t={t}
          notVerifiedUsersLength={notVerifiedUsers}
          notificationsLength={notifications.length}
          version={version}
        />
      </CustomDrawer>
    </Box>
  );
};
