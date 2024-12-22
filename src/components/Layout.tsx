import React, { ReactNode, useRef, useEffect, useState } from 'react';
import { AppBar, Avatar, Box, IconButton, TextField, Toolbar, Typography } from '@mui/material';
import { AccountCircle, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import CustomBottomNavigation from './BottomNavigation';
import { useAuth } from '../features/auth/AuthContext';
import { FirebaseMessaging } from '../features/notifications/FirebaseMessaging';

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
  const user = useAuth();
  const [appBarHeight, setAppBarHeight] = useState(64); // Default AppBar height
  const appBarRef = useRef<HTMLDivElement|null>(null);

  useEffect(() => {
    if (appBarRef.current) {
      setAppBarHeight(appBarRef.current.offsetHeight);
    }
  }, [])

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh', // Volle Ansichtshöhe
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // Kein Overflow außerhalb des Containers
      }}
    >
      {/* AppBar */}
      <AppBar
        ref={appBarRef}
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'primary',
          top: 0,
          pt: 'env(safe-area-inset-top)',
        }}
      >
        <Toolbar
          sx={{
            width: 'calc(100% - 48px)',
            maxWidth: 1200,
            mx: 'auto',
          }}
        >
          {/* Optional Back Button */}
          {showBackButton && (
            <IconButton color="inherit" onClick={() => navigate(-1)} edge="start" sx={{ mr: 2 }}>
              <ArrowBack />
            </IconButton>
          )}
          {/* Title */}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {/* Profile */}
          {showProfile && (
            <IconButton
              color="inherit"
              onClick={() => {
                navigate('/user/');
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

      <FirebaseMessaging />

      {/* Main Content */}
      <Box
        data-content-container
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          alignItems: 'center',
          flex: 1,
          overflowY: 'auto',
          mt: `${appBarRef?.current?.offsetHeight || 64}px`,
        }}
      >
        <Box>{children}</Box>

        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            width: '100%',
            pb: 'env(safe-area-inset-bottom)', // Safe Area Unterstützung
            zIndex: 2,
          }}
        >
          <CustomBottomNavigation />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
