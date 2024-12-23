import {
  alpha,
  Box,
  BoxProps,
  Divider,
  Drawer as MaterialDrawer,
  DrawerProps,
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemProps,
  ListItemText,
  ListSubheader,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import {
  EmojiEvents,
  Euro,
  History,
  Key,
  Liquor,
  Notifications,
  Person,
  Scoreboard,
  SportsHandball,
} from '@mui/icons-material';
import { styled } from '@mui/system';
import { HOMEPAGE } from '../constants';
import { useNavigate } from 'react-router-dom';
import { can, canAny } from '../utils/PermissionService';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { notificationsSelector } from '../features/notifications/slices/notificationsSlice';

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
      backgroundColor: alpha(theme.palette.secondary.main, 0.2),
    },
  }),
}));

const DrawerBox = styled(Box)<BoxProps>(({ theme }) => ({
  width: 360,
  height: '100%',
}));

const CustomDrawer = styled(MaterialDrawer)<DrawerProps>(({ theme }) => ({
  '& .MuiPaper-root': {
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    background: '#f2ecf1',
    color: '#49454e',
  },
}));

export const Drawer = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState<string>(HOMEPAGE);
  const notifications = useSelector((state: RootState) => notificationsSelector.selectAll(state));

  useEffect(() => {
    setTab(window.location.pathname.substring(1));
  }, [window.location.pathname]);

  const handleChange = (newValue: string) => {
    setTab(newValue);
    navigate('/' + newValue);
  };

  return (
    <CustomDrawer open={open} onClose={onClose}>
      <DrawerBox>
        <List>
          <DrawerItem selected={tab === 'user'} onClick={() => handleChange('user')}>
            <ListItemAvatar>
              <ListItemIcon>
                <Person />
              </ListItemIcon>
            </ListItemAvatar>
            <ListItemText primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }} primary={'Account'} />
          </DrawerItem>
        </List>
        <Divider />
        {canAny('select', ['drink', 'history', 'payments']) && (
          <>
            <List
              subheader={
                <ListSubheader
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
                <DrawerItem selected={tab == 'drinks'} onClick={() => handleChange('drinks')}>
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
                <DrawerItem selected={tab === 'history'} onClick={() => handleChange('history')}>
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
                <DrawerItem selected={tab === 'payments'} onClick={() => handleChange('payments')}>
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
            </List>
            <Divider />
          </>
        )}

        <List>
          {can('select', 'event') && (
            <DrawerItem selected={tab === 'training'} onClick={() => handleChange('training')}>
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
          {can('select', 'challenge') && (
            <DrawerItem selected={tab === 'challenges'} onClick={() => handleChange('challenges')}>
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
            <DrawerItem selected={tab === 'keys'} onClick={() => handleChange('keys')}>
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
              selected={tab === 'notifications'}
              onClick={() => handleChange('notifications')}
              secondaryAction={
                <Typography sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{notifications.length || ''}</Typography>
              }
            >
              <ListItemAvatar>
                <ListItemIcon>
                  <Notifications />
                </ListItemIcon>
              </ListItemAvatar>
              <ListItemText
                primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
                primary={t('browse.notifications')}
              />
            </DrawerItem>
          )}
          {can('view', 'notifications') && (
            <DrawerItem selected={tab === 'games'}>
              <ListItemAvatar sx={{ width: '28px', height: '28px', mr: '12px', minWidth: 'unset' }}>
                <ListItemIcon>
                  <Scoreboard />
                </ListItemIcon>
              </ListItemAvatar>
              <ListItemText primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }} primary={'Spiele'} />
            </DrawerItem>
          )}
        </List>
      </DrawerBox>
    </CustomDrawer>
  );
};
