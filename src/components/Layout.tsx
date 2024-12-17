import React, { ReactNode } from 'react';
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

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* AppBar */}
      <AppBar
        position="static"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'primary',
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
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          alignItems: 'center',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        <Box>{children}</Box>

        <CustomBottomNavigation />
      </Box>
    </Box>
  );
};

export default Layout;
