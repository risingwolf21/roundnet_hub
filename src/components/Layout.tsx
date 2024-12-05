import React, { ReactNode } from 'react';
import { AppBar, Avatar, Box, IconButton, TextField, Toolbar, Typography } from '@mui/material';
import { AccountCircle, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import CustomBottomNavigation from './BottomNavigation';
import { useAuth } from '../features/auth/AuthContext';

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
    <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100vh' }}>
      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: 'primary' }}>
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

      {/* Main Content */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          mb: 7,
          mt: 8,
          flexGrow: 1,
          overflow: 'auto',
        }}
      >
        {children}
      </Box>

      <CustomBottomNavigation />
    </Box>
  );
};

export default Layout;
