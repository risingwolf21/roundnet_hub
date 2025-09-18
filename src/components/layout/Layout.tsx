import { AccountCircle, ArrowBack, Menu } from '@mui/icons-material';
import { AppBar, Avatar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import React, { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BRANDING } from '@/utils';
import { useApplication } from '../../features/auth/ApplicationContext';
import { Drawer, drawerWidth } from '../Drawer';

type Props = {
  children: ReactNode;
  appBarActions?: ReactNode;
  appBarConfig?: {
    title?: string;
    navigateBackPath?: string;
    showProfile?: boolean;
  };
};

const Layout = ({
  children,
  appBarActions,
  appBarConfig: { title = BRANDING.title, showProfile = true, navigateBackPath } = {
    title: BRANDING.title,
    showProfile: true,
  },
}: Props) => {
  const navigate = useNavigate();
  const { user } = useApplication();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    if (!iOS) return;
    const preventSwipeBack = (e: TouchEvent) => {
      if (e.touches[0].clientX < 25) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventSwipeBack, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventSwipeBack);
    };
  }, [iOS]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100dvh',
        display: 'flex',
        overflowY: 'none', // Kein Overflow außerhalb des Containers
      }}
    >
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={(theme) => ({
          zIndex: theme.zIndex.drawer + 1,
          background: 'primary',
          top: 0,
          [theme.breakpoints.down('lg')]: {
            width: `100%`,
          },
          [theme.breakpoints.up('lg')]: {
            width: `calc(100% - ${drawerWidth}px)`,
            ml: `${drawerWidth}px`,
          },
        })}
      >
        <Box sx={{ height: 'env(safe-area-inset-top)' }} />
        <Toolbar>
          {navigateBackPath ? (
            <IconButton
              color="inherit"
              onClick={() => navigate(navigateBackPath)}
              edge="start"
              sx={(theme) => ({
                mr: 2,
              })}
            >
              <ArrowBack />
            </IconButton>
          ) : (
            <IconButton
              color="inherit"
              onClick={() => setDrawerOpen(true)}
              edge="start"
              sx={(theme) => ({
                mr: 2,
                [theme.breakpoints.up('lg')]: {
                  display: 'none',
                },
              })}
            >
              <Menu />
            </IconButton>
          )}

          {/* Title */}
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {/* Profile */}
          {showProfile && user && (
            <IconButton
              color="inherit"
              onClick={() => {
                navigate('/user');
              }}
              sx={{ pr: 0 }}
            >
              {user.avatarUrl ? (
                <Avatar sx={{ borderRadius: 2, width: '35px', height: '35px' }}>
                  <img src={user?.avatarUrl} alt="logo" width={'35px'} height={'35px'} />
                </Avatar>
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          )}
          {appBarActions}
        </Toolbar>
      </AppBar>

      {/* Drawer  */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />

      {/* Main Content */}
      <Box
        component="main"
        sx={(theme) => ({
          flexGrow: 1,
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          pt: 'env(safe-area-inset-top)',
          pb: 'env(safe-area-inset-bottom)',
          [theme.breakpoints.down('lg')]: {
            width: '100%',
          },
          [theme.breakpoints.up('lg')]: {
            width: `calc(100% - ${drawerWidth}px)`,
          },
        })}
      >
        <Toolbar />
        <Box
          sx={{
            width: '100%',
            overflowY: 'auto',
            alignItems: 'center',
            pb: 'env(safe-area-inset-bottom)',
            flexGrow: 1,
            height: '100svh',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
