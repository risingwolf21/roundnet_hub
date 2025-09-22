import { BRANDING } from '@/utils';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { drawerWidth } from '../Drawer';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

const AuthLayout = () => {
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
          width: `100%`,
        })}
      >
        <Box sx={{ height: 'env(safe-area-inset-top)' }} />
        <Toolbar>
          {/* Title */}
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {BRANDING.title}
          </Typography>
        </Toolbar>
      </AppBar>

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
          <Box sx={{ height: '100%' }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AuthLayout;
