import { AccountCircle, ArrowBack, Menu } from '@mui/icons-material';
import { AppBar, Avatar, Box, CssBaseline, IconButton, TextField, Toolbar, Typography } from '@mui/material';
import React, { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { FirebaseMessaging } from '../features/notifications/FirebaseMessaging';
import { Drawer, drawerWidth } from './Drawer';

type Props = {
  children: ReactNode;
  appBarActions?: ReactNode;
  appBarConfig?: {
    title?: string;
    showBackButton?: boolean;
    showProfile?: boolean;
    showSearch?: boolean;
    onSearchChange?: (value: string) => void;
  };
};

const Layout = ({
  children,
  appBarActions,
  appBarConfig: {
    title = 'Roundnet Karlsruhe',
    showBackButton = false,
    showProfile = true,
    showSearch,
    onSearchChange,
  } = { title: 'Roundnet Karlsruhe', showBackButton: false, showProfile: true },
}: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: 'calc(100vh + env(safe-area-inset-top))',
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
          pt: 'env(safe-area-inset-top)',
          [theme.breakpoints.down('lg')]: {
            width: `100%`,
          },
          [theme.breakpoints.up('lg')]: {
            width: `calc(100% - ${drawerWidth}px)`,
            ml: `${drawerWidth}px`,
          },
        })}
      >
        <Toolbar>
          {showBackButton ? (
            <IconButton
              color="inherit"
              onClick={() => navigate(-1)}
              edge="start"
              sx={(theme) => ({
                mr: 2,
                [theme.breakpoints.up('lg')]: {
                  display: 'none',
                },
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
          {showProfile && (
            <IconButton
              color="inherit"
              onClick={() => {
                navigate('/user');
              }}
              sx={{ pr: 0 }}
            >
              {user.avatarUrl ? (
                <Avatar sx={{ borderRadius: 2, width: '35px', height: '35px' }}>
                  <img src={user.avatarUrl} alt="logo" width={'35px'} height={'35px'} />
                </Avatar>
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          )}
          {/* Optional Search */}
          {showSearch && onSearchChange && (
            <TextField
              variant="outlined"
              size="small"
              placeholder="Search..."
              onChange={(e) => onSearchChange(e.target.value)}
              sx={{ backgroundColor: 'white', borderRadius: 1 }}
            />
          )}
          {appBarActions}
        </Toolbar>
      </AppBar>

      {/* Drawer  */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <FirebaseMessaging />

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
            flexGrow: 1,
            flex: 1,
          }}
        >
          <Box>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
