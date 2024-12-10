import { AdminPanelSettings, EmojiEvents, Liquor, List, SportsHandball } from '@mui/icons-material';
import { Badge, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { TFunction } from 'i18next';
import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { can } from 'src/utils/PermissionService';
import { RootState } from '../redux/store';
import { notificationsSelector } from '../features/notifications/slices/notificationsSlice';
import { HOMEPAGE } from '../constants';

const CustomBottomNavigation = () => {
  let navigate = useNavigate();
  const { hasNotVerifiedUsers } = useSelector((state: RootState) => state.adminUsers);
  const notifications = useSelector((state: RootState) => notificationsSelector.selectAll(state));
  const [tab, setTab] = useState<string>(HOMEPAGE);

  useEffect(() => {
    setTab(window.location.pathname.substring(1));
  }, [window.location.pathname]);

  const handleChange = (e: any, newValue: string) => {
    setTab(newValue);
    navigate('/' + newValue, { replace: true });
  };

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
      <BottomNavigation value={tab} onChange={handleChange}>
        {can('select', 'event') && (
          <BottomNavigationAction
            key={'training'}
            value={'training'}
            aria-selected={tab === 'training'}
            icon={<SportsHandball />}
          />
        )}
        {can('select', 'drink') && (
          <BottomNavigationAction key={'drinks'} value={'drinks'} aria-selected={tab === 'drinks'} icon={<Liquor />} />
        )}
        {can('select', 'challenge') && (
          <BottomNavigationAction
            key={'challenges'}
            value={'challenges'}
            aria-selected={tab === 'challenges'}
            icon={<EmojiEvents />}
          />
        )}
        <BottomNavigationAction
          key={'browse'}
          value={'browse'}
          aria-selected={tab === 'browse'}
          icon={
            <Badge color="secondary" variant="dot" badgeContent={' '} invisible={notifications.length < 1}>
              <List />
            </Badge>
          }
        />
        {can('select', 'browseAdmin') && (
          <BottomNavigationAction
            key={'admin'}
            value={'browse-admin'}
            aria-selected={tab === 'browse-admin'}
            icon={
              <Badge color="secondary" variant="dot" badgeContent={' '} invisible={!hasNotVerifiedUsers}>
                <AdminPanelSettings />
              </Badge>
            }
          />
        )}
      </BottomNavigation>
    </Paper>
  );
};

export default withTranslation()(CustomBottomNavigation);
